const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

// Mock environment variables for testing
process.env.JWT_SECRET = "production-audit-secret";
process.env.NODE_ENV = "test";

const { createRepository } = require("./repository");
const { enforceCsrfGuard } = require("./src/middleware/csrf.middleware");
const { deliverAccountEmail } = require("./src/services/auth.service");

async function runTests() {
  console.log("🚀 Starting Zero-Trust Production Readiness Test Suite...");

  // Setup isolated JSON store path
  const seedStorePath = path.join(__dirname, "data", "store.json");
  const testStorePath = path.join(os.tmpdir(), `flowpilot-audit-store-${Date.now()}.json`);
  fs.copyFileSync(seedStorePath, testStorePath);

  const repository = createRepository({ seedStorePath, storePath: testStorePath });
  
  // Override the global app.js repository with our test repository to ensure isolation
  const appModule = require("./src/app");
  appModule.repository = repository;

  try {
    // ----------------------------------------------------
    // Test Area 1: Domain Repository CRUD
    // ----------------------------------------------------
    console.log("  1. Testing Domain Repository CRUD...");
    const testUserId = `usr_${crypto.randomBytes(8).toString("hex")}`;
    const user = {
      id: testUserId,
      name: "Auditor User",
      email: `${testUserId}@audit.com`,
      passwordHash: "saltedhash",
      emailVerified: false,
      plan: "free",
      createdAt: new Date().toISOString()
    };
    await repository.users.create(user);
    
    const fetchedUser = await repository.users.getById(testUserId);
    assert.equal(fetchedUser.name, "Auditor User");
    assert.equal(fetchedUser.emailVerified, false);

    await repository.users.update(testUserId, { emailVerified: true });
    const updatedUser = await repository.users.getById(testUserId);
    assert.equal(updatedUser.emailVerified, true);

    const emailUser = await repository.users.getByEmail(`${testUserId}@audit.com`);
    assert.ok(emailUser);
    assert.equal(emailUser.id, testUserId);

    // ----------------------------------------------------
    // Test Area 2: CSRF Middleware Hostname Strict Verification
    // ----------------------------------------------------
    console.log("  2. Testing CSRF host verification guard...");
    const mockRes = {
      statusCode: 200,
      headers: {},
      writeHead(status, headers) {
        this.statusCode = status;
        this.headers = headers;
      },
      end(body) {
        this.body = body;
      }
    };
    
    // Test valid local hosts
    let nextCalled = false;
    enforceCsrfGuard(
      { method: "POST", headers: { origin: "http://localhost:3000" }, url: "/api/leads" },
      mockRes,
      () => { nextCalled = true; }
    );
    assert.ok(nextCalled);

    // Test attacker hosts containing localhost substring
    let attackerCalled = false;
    let attackerRes = {
      statusCode: 200,
      headers: {},
      writeHead(status, headers) {
        this.statusCode = status;
        this.headers = headers;
      },
      end(body) {
        this.body = body;
      }
    };
    enforceCsrfGuard(
      { method: "POST", headers: { origin: "http://attackerlocalhost.com" }, url: "/api/leads" },
      attackerRes,
      () => { attackerCalled = true; }
    );
    assert.ok(!attackerCalled);
    assert.equal(attackerRes.statusCode, 403);

    // ----------------------------------------------------
    // Test Area 3: OAuth State token kind verification
    // ----------------------------------------------------
    console.log("  3. Testing OAuth state consumption verification...");
    const stateToken = crypto.randomBytes(16).toString("hex");
    const kind = "gmail_oauth_state";
    await repository.authTokens.create({
      id: `tok_${crypto.randomBytes(8).toString("hex")}`,
      userId: testUserId,
      kind,
      tokenHash: stateToken,
      expiresAt: new Date(Date.now() + 50000).toISOString(),
      createdAt: new Date().toISOString()
    });

    // Test consumption succeeds with exact kind
    const consumed = await repository.authTokens.consumeOauthState(stateToken, kind);
    assert.ok(consumed);
    assert.equal(consumed.userId, testUserId);

    // Test replay prevention (consumed token should be deleted)
    const consumedAgain = await repository.authTokens.consumeOauthState(stateToken, kind);
    assert.ok(!consumedAgain);

    // ----------------------------------------------------
    // Test Area 4: Gmail Syncing & nextPageToken Pagination
    // ----------------------------------------------------
    console.log("  4. Testing Gmail syncing & paginated message parsing...");
    const { listGmailInboxMessages } = require("./src/services/gmail.service");
    
    // Mock global fetch for Gmail pagination & rate-limit retries
    let fetchCount = 0;
    globalThis.fetch = async (url, options) => {
      fetchCount++;
      const urlObj = new URL(url);
      const pageToken = urlObj.searchParams.get("pageToken");

      if (fetchCount === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            messages: [{ id: "msg_1" }, { id: "msg_2" }],
            nextPageToken: "token_page_2"
          })
        };
      } else if (fetchCount === 2) {
        assert.equal(pageToken, "token_page_2");
        return {
          ok: true,
          status: 200,
          json: async () => ({
            messages: [{ id: "msg_3" }]
          })
        };
      }
    };

    const messages = await listGmailInboxMessages("dummy_token", "in:inbox", 2);
    assert.equal(messages.length, 3);
    assert.equal(messages[0].id, "msg_1");
    assert.equal(messages[2].id, "msg_3");

    // ----------------------------------------------------
    // Test Area 5: Gmail Retry Logic & Exponential Backoff
    // ----------------------------------------------------
    console.log("  5. Testing Gmail API retry backoffs...");
    let retryAttempts = 0;
    globalThis.fetch = async (url, options) => {
      retryAttempts++;
      if (retryAttempts === 1) {
        return { ok: false, status: 429 };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ messages: [{ id: "retry_msg" }] })
      };
    };

    const retryMessages = await listGmailInboxMessages("dummy_token", "in:inbox", 1);
    assert.equal(retryMessages.length, 1);
    assert.equal(retryMessages[0].id, "retry_msg");
    assert.equal(retryAttempts, 2);

    // ----------------------------------------------------
    // Test Area 6: Outbox Lifecycle and Status Transitions
    // ----------------------------------------------------
    console.log("  6. Testing Outbox state transitions & recovery...");
    const mailItem = {
      id: `mail_${crypto.randomBytes(8).toString("hex")}`,
      userId: testUserId,
      toEmail: "test@audit.com",
      kind: "approval_reminder",
      status: "queued",
      link: "http://localhost:3000/?page=approvals",
      createdAt: new Date().toISOString(),
      sentAt: null
    };

    await repository.outbox.create(mailItem);
    const listedOutbox = await repository.outbox.list();
    const insertedMail = listedOutbox.find(item => item.id === mailItem.id);
    assert.equal(insertedMail.status, "queued");

    await deliverAccountEmail(insertedMail);
    const updatedMail = (await repository.outbox.list()).find(item => item.id === mailItem.id);
    assert.equal(updatedMail.status, "sent");
    assert.ok(updatedMail.sentAt);

    // ----------------------------------------------------
    // Test Area 7: Worker Idempotency
    // ----------------------------------------------------
    console.log("  7. Testing lead worker idempotency...");
    const { processLead } = require("./src/workers/leadProcessing.worker");
    
    const leadId = `lead_${crypto.randomBytes(8).toString("hex")}`;
    const lead = {
      id: leadId,
      userId: testUserId,
      name: "John Auditor",
      email: "john@audit.com",
      message: "Verify idempotency.",
      source: "manual",
      status: "new",
      createdAt: new Date().toISOString()
    };
    await repository.leads.create(lead);

    const run1 = await processLead({ data: { userId: testUserId, leadId } });
    assert.ok(run1.approvalId);

    const run2 = await processLead({ data: { userId: testUserId, leadId } });
    assert.equal(run2.approvalId, run1.approvalId);

    const approvals = await repository.approvals.listByUserId(testUserId);
    const leadApprovals = approvals.filter(a => a.leadId === leadId);
    assert.equal(leadApprovals.length, 1);

    // ----------------------------------------------------
    // Test Area 8: Refresh Token Replay Protection and Revocation
    // ----------------------------------------------------
    console.log("  8. Testing refresh token rotation, replay detection, and revocation...");
    const { tokenHash } = require("./src/utils/crypto");
    const rawRefreshToken = crypto.randomBytes(32).toString("hex");
    
    const tokenRecord = {
      id: `ref_${crypto.randomBytes(8).toString("hex")}`,
      userId: testUserId,
      kind: "refresh_token",
      tokenHash: tokenHash(rawRefreshToken),
      expiresAt: new Date(Date.now() + 50000).toISOString(),
      createdAt: new Date().toISOString(),
      usedAt: null
    };
    await repository.authTokens.create(tokenRecord);

    const { refreshToken: refreshTokenEndpoint } = require("./src/controllers/auth.controller");
    
    let resData;
    const mockResObj1 = {
      statusCode: 200,
      headers: {},
      writeHead(status, headers) {
        this.statusCode = status;
        this.headers = headers;
      },
      end(body) {
        resData = JSON.parse(body);
      }
    };

    await refreshTokenEndpoint({ body: { refreshToken: rawRefreshToken } }, mockResObj1);
    assert.equal(mockResObj1.statusCode, 200);
    assert.ok(resData.refreshToken);
    const newRawRefreshToken = resData.refreshToken;

    const originalTokenUpdated = await repository.authTokens.getByKindAndHash("refresh_token", tokenHash(rawRefreshToken));
    assert.ok(originalTokenUpdated.usedAt);

    const siblingToken = {
      id: `ref_${crypto.randomBytes(8).toString("hex")}`,
      userId: testUserId,
      kind: "refresh_token",
      tokenHash: tokenHash(crypto.randomBytes(32).toString("hex")),
      expiresAt: new Date(Date.now() + 50000).toISOString(),
      createdAt: new Date().toISOString(),
      usedAt: null
    };
    await repository.authTokens.create(siblingToken);

    let mockResObj2 = {
      statusCode: 200,
      headers: {},
      writeHead(status, headers) {
        this.statusCode = status;
        this.headers = headers;
      },
      end(body) {
        resData = JSON.parse(body);
      }
    };

    await refreshTokenEndpoint({ body: { refreshToken: rawRefreshToken } }, mockResObj2);
    assert.equal(mockResObj2.statusCode, 401);
    assert.equal(resData.error, "compromised session: refresh token reuse detected");

    const siblingTokenFetched = await repository.authTokens.getByKindAndHash("refresh_token", siblingToken.tokenHash);
    assert.equal(siblingTokenFetched, null);
    const rotatedTokenFetched = await repository.authTokens.getByKindAndHash("refresh_token", tokenHash(newRawRefreshToken));
    assert.equal(rotatedTokenFetched, null);

    console.log("✅ Zero-Trust Production Audit Test Suite Completed Successfully!");
  } finally {
    fs.rmSync(testStorePath, { force: true });
  }
}

runTests().catch(err => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
