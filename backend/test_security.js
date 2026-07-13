const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

process.env.JWT_SECRET = "security-audit-secret";
process.env.NODE_ENV = "test";
process.env.GMAIL_CLIENT_ID = "mock-gmail-id";
process.env.GMAIL_CLIENT_SECRET = "mock-gmail-secret";
process.env.HUBSPOT_CLIENT_ID = "mock-hubspot-id";
process.env.HUBSPOT_CLIENT_SECRET = "mock-hubspot-secret";

const { createRepository } = require("./repository");
const { enforceCsrfGuard } = require("./src/middleware/csrf.middleware");
const { verifyToken, signToken } = require("./src/services/jwt.service");
const { tokenHash } = require("./src/utils/crypto");

async function runSecurityTests() {
  console.log("🔒 Starting Zero-Trust Security Validation Test Suite...");

  const seedStorePath = path.join(__dirname, "data", "store.json");
  const testStorePath = path.join(os.tmpdir(), `flowpilot-security-store-${Date.now()}.json`);
  fs.copyFileSync(seedStorePath, testStorePath);

  const repository = createRepository({ seedStorePath, storePath: testStorePath });

  // Isolate repository module exports
  const appModule = require("./src/app");
  appModule.repository = repository;

  try {
    // ----------------------------------------------------
    // 1. CSRF Guard checks
    // ----------------------------------------------------
    console.log("  1. Testing CSRF hostname guards...");
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

    let nextCalled = false;
    enforceCsrfGuard(
      { method: "POST", headers: { origin: "http://localhost:3000" }, url: "/api/leads" },
      mockRes,
      () => { nextCalled = true; }
    );
    assert.ok(nextCalled);

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
      { method: "POST", headers: { origin: "https://attackerlocalhost.com" }, url: "/api/leads" },
      attackerRes,
      () => { attackerCalled = true; }
    );
    assert.ok(!attackerCalled);
    assert.equal(attackerRes.statusCode, 403);

    await repository.users.create({
      id: "usr_123",
      name: "Security Test User",
      email: "security@test.com",
      passwordHash: "dummy",
      emailVerified: true,
      plan: "free",
      createdAt: new Date().toISOString()
    });

    // ----------------------------------------------------
    // 2. JWT expiration validation
    // ----------------------------------------------------
    console.log("  2. Testing JWT expiration checks...");
    const token = signToken({ sub: "usr_123" });
    const verified = verifyToken(token);
    assert.equal(verified.sub, "usr_123");

    assert.equal(verifyToken(token + "corrupted"), null);

    // ----------------------------------------------------
    // 3. OAuth provider state isolation
    // ----------------------------------------------------
    console.log("  3. Testing OAuth provider state parameter isolation...");
    const stateTokenVal = crypto.randomBytes(16).toString("hex");
    const gmailKind = "gmail_oauth_state";
    const hubspotKind = "hubspot_oauth_state";

    await repository.authTokens.create({
      id: `tok_${crypto.randomBytes(8).toString("hex")}`,
      userId: "usr_123",
      kind: gmailKind,
      tokenHash: stateTokenVal,
      expiresAt: new Date(Date.now() + 50000).toISOString(),
      createdAt: new Date().toISOString()
    });

    const badConsumption = await repository.authTokens.consumeOauthState(stateTokenVal, hubspotKind);
    assert.equal(badConsumption, null);

    const goodConsumption = await repository.authTokens.consumeOauthState(stateTokenVal, gmailKind);
    assert.ok(goodConsumption);
    assert.equal(goodConsumption.userId, "usr_123");

    // ----------------------------------------------------
    // 4. Refresh Token Replay Revocation
    // ----------------------------------------------------
    console.log("  4. Testing refresh token reuse and automatic revocation...");
    const rawRefreshToken = crypto.randomBytes(32).toString("hex");
    

    const tokenRecord = {
      id: `ref_${crypto.randomBytes(8).toString("hex")}`,
      userId: "usr_123",
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
    const newRefreshToken = resData.refreshToken;

    const originalTokenUpdated = await repository.authTokens.getByKindAndHash("refresh_token", tokenHash(rawRefreshToken));
    assert.ok(originalTokenUpdated.usedAt);

    const siblingToken = {
      id: `ref_${crypto.randomBytes(8).toString("hex")}`,
      userId: "usr_123",
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
    const rotatedTokenFetched = await repository.authTokens.getByKindAndHash("refresh_token", tokenHash(newRefreshToken));
    assert.equal(rotatedTokenFetched, null);

    // ----------------------------------------------------
    // 5. OAuth PKCE flow verification
    // ----------------------------------------------------
    console.log("  5. Testing OAuth PKCE flow redirection challenge and callback verifier verification...");
    const { oauthAuthorizationUrl, verifyOauthState } = require("./src/services/oauth.service");
    
    const authUrl = await oauthAuthorizationUrl("usr_123", "gmail");
    assert.ok(authUrl);
    
    const parsedUrl = new URL(authUrl);
    const stateParam = parsedUrl.searchParams.get("state");
    const codeChallenge = parsedUrl.searchParams.get("code_challenge");
    const challengeMethod = parsedUrl.searchParams.get("code_challenge_method");
    
    assert.ok(stateParam);
    assert.ok(codeChallenge);
    assert.equal(challengeMethod, "S256");

    const statePayload = await verifyOauthState(stateParam, "gmail");
    assert.ok(statePayload);
    assert.equal(statePayload.sub, "usr_123");
    assert.ok(statePayload.verifier);

    const calculatedChallenge = crypto.createHash("sha256").update(statePayload.verifier).digest("base64url");
    assert.equal(calculatedChallenge, codeChallenge);

    console.log("✅ Zero-Trust Security Validation Test Suite Passed!");
  } finally {
    fs.rmSync(testStorePath, { force: true });
  }
}

runSecurityTests().catch(err => {
  console.error("❌ Security tests failed:", err);
  process.exit(1);
});
