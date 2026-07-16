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

    // Test workspaceMembers repository CRUD
    const testMemberId = `wmem_${crypto.randomBytes(8).toString("hex")}`;
    const testWorkspaceId = `wsp_${crypto.randomBytes(8).toString("hex")}`;
    const member = {
      id: testMemberId,
      workspaceId: testWorkspaceId,
      userId: testUserId,
      role: "owner",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await repository.workspaceMembers.create(member);

    const fetchedMember = await repository.workspaceMembers.getByWorkspaceAndUser(testWorkspaceId, testUserId);
    assert.ok(fetchedMember);
    assert.equal(fetchedMember.role, "owner");
    assert.equal(fetchedMember.id, testMemberId);

    const workspaceList = await repository.workspaceMembers.listByWorkspaceId(testWorkspaceId);
    assert.equal(workspaceList.length, 1);
    assert.equal(workspaceList[0].id, testMemberId);

    const userList = await repository.workspaceMembers.listByUserId(testUserId);
    assert.ok(userList.some(m => m.id === testMemberId));

    await repository.workspaceMembers.update(testMemberId, { role: "admin" });
    const updatedMember = await repository.workspaceMembers.getByWorkspaceAndUser(testWorkspaceId, testUserId);
    assert.equal(updatedMember.role, "admin");

    await repository.workspaceMembers.delete(testMemberId);
    const deletedMember = await repository.workspaceMembers.getByWorkspaceAndUser(testWorkspaceId, testUserId);
    assert.equal(deletedMember, null);

    // Leads V2 query tests
    const leadV2Id1 = `lead_v2_1_${crypto.randomBytes(4).toString("hex")}`;
    const leadV2Id2 = `lead_v2_2_${crypto.randomBytes(4).toString("hex")}`;
    const leadV2Id3 = `lead_v2_3_${crypto.randomBytes(4).toString("hex")}`;

    await repository.leads.create("biz_mock", {
      id: leadV2Id1,
      userId: testUserId,
      name: "Alice Adams",
      email: "alice@adams.com",
      phone: "111-222-3333",
      message: "Lead Alice inquiry",
      status: "new",
      notes: "Follow up tomorrow",
      tags: ["urgent", "tech"],
      assignedTo: "usr_agent_001",
      createdAt: new Date(Date.now() - 3000).toISOString()
    });

    await repository.leads.create("biz_mock", {
      id: leadV2Id2,
      userId: testUserId,
      name: "Bob Builder",
      email: "bob@builder.com",
      phone: "444-555-6666",
      message: "Lead Bob message",
      status: "contacted",
      notes: "Met at conference",
      tags: ["marketing"],
      assignedTo: "usr_agent_002",
      createdAt: new Date(Date.now() - 2000).toISOString()
    });

    await repository.leads.create("biz_mock", {
      id: leadV2Id3,
      userId: testUserId,
      name: "Charlie Cook",
      email: "charlie@cook.com",
      phone: "777-888-9999",
      message: "Lead Charlie request",
      status: "new",
      notes: "Urgent quote request",
      tags: ["urgent", "design"],
      assignedTo: "usr_agent_001",
      createdAt: new Date(Date.now() - 1000).toISOString()
    });

    // Test Search
    const searchResult = await repository.leads.listByWorkspaceId("biz_mock", { search: "conference" });
    assert.equal(searchResult.length, 1);
    assert.equal(searchResult[0].id, leadV2Id2);

    const searchNotesResult = await repository.leads.listByWorkspaceId("biz_mock", { search: "Urgent quote" });
    assert.equal(searchNotesResult.length, 1);
    assert.equal(searchNotesResult[0].id, leadV2Id3);

    // Test Status Filter
    const statusResult = await repository.leads.listByWorkspaceId("biz_mock", { status: "contacted" });
    assert.equal(statusResult.length, 1);
    assert.equal(statusResult[0].id, leadV2Id2);

    // Test Assignee Filter
    const assigneeResult = await repository.leads.listByWorkspaceId("biz_mock", { assignedTo: "usr_agent_001" });
    assert.equal(assigneeResult.length, 2);
    assert.ok(assigneeResult.some(l => l.id === leadV2Id1));
    assert.ok(assigneeResult.some(l => l.id === leadV2Id3));

    // Test Pagination
    const paginatedResult = await repository.leads.listByWorkspaceId("biz_mock", { page: 1, limit: 2 });
    assert.equal(paginatedResult.length, 2);
    assert.equal(paginatedResult[0].id, leadV2Id3); // Charlie (newest)
    assert.equal(paginatedResult[1].id, leadV2Id2); // Bob (second newest)

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
    // Test Area 5.5: Gmail Inbox Sync Checkpoint & Idempotency
    // ----------------------------------------------------
    console.log("  5.5 Testing Gmail Inbox Sync checkpointing, thread tracking, and idempotency...");
    const { syncGmailInbox } = require("./src/services/gmail.service");
    
    // Seed workspace for test user
    const testBizId = `biz_${crypto.randomBytes(8).toString("hex")}`;
    await repository.businesses.create({
      id: testBizId,
      userId: testUserId,
      name: "Audit Workspace",
      type: "consulting",
      tone: "professional",
      goals: ["lead_follow_up"]
    });

    // Seed Gmail integration
    const { encryptSecret } = require("./src/utils/crypto");
    const encryptedCredentials = encryptSecret(
      {
        access_token: "mock_access",
        refresh_token: "mock_refresh",
        obtained_at: new Date().toISOString(),
        expires_in: 3600
      },
      testUserId
    );
    await repository.integrations.create(testBizId, {
      id: `int_${crypto.randomBytes(8).toString("hex")}`,
      userId: testUserId,
      provider: "gmail",
      status: "connected",
      encryptedCredentials,
      connectedEmail: "audit@gmail.com"
    });

    // Mock fetch for Gmail API message listing and fetch details
    let apiCallCount = 0;
    globalThis.fetch = async (url, options) => {
      apiCallCount++;
      const urlStr = String(url);
      if (urlStr.includes("/messages?")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            messages: [
              { id: "msg_inbox_1", threadId: "thread_1", historyId: "100" },
              { id: "msg_inbox_2", threadId: "thread_2", historyId: "101" }
            ]
          })
        };
      } else if (urlStr.includes("/messages/msg_inbox_1")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: "msg_inbox_1",
            threadId: "thread_1",
            snippet: "Inquiry 1 snippet",
            payload: {
              headers: [
                { name: "From", value: "Sender One <one@audit.com>" },
                { name: "Subject", value: "Subject One" }
              ]
            }
          })
        };
      } else if (urlStr.includes("/messages/msg_inbox_2")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: "msg_inbox_2",
            threadId: "thread_2",
            snippet: "Inquiry 2 snippet",
            payload: {
              headers: [
                { name: "From", value: "Sender Two <two@audit.com>" },
                { name: "Subject", value: "Subject Two" }
              ]
            }
          })
        };
      }
      return { ok: false, status: 404 };
    };

    // Create a mock helper for createLeadApproval
    const mockCreateLeadApproval = async (u, body, wsId) => {
      const createdLead = await repository.leads.create(wsId, {
        id: `lead_sync_${crypto.randomBytes(4).toString("hex")}`,
        userId: u.id,
        name: body.name,
        email: body.email,
        message: body.message,
        source: body.source,
        gmailMessageId: body.gmailMessageId,
        createdAt: new Date().toISOString()
      });
      return { lead: createdLead };
    };

    // Run first sync
    const firstSync = await syncGmailInbox({ id: testUserId }, { createLeadApproval: mockCreateLeadApproval });
    assert.equal(firstSync.count, 2);
    assert.equal(firstSync.leads[0].name, "Sender One");
    assert.equal(firstSync.leads[1].name, "Sender Two");

    // Verify sync state is updated
    const syncStateAfter = await repository.gmailSyncState.getByWorkspaceId(testBizId);
    assert.equal(syncStateAfter.lastHistoryId, "100");
    assert.ok(syncStateAfter.processedMessageIds.includes("msg_inbox_1"));
    assert.ok(syncStateAfter.processedThreadIds.includes("thread_1"));

    // Run second sync with same messages
    const secondSync = await syncGmailInbox({ id: testUserId }, { createLeadApproval: mockCreateLeadApproval });
    // Should skip both messages due to tracking idempotency!
    assert.equal(secondSync.count, 0);

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
    const workerBiz = await repository.businesses.getByUserId(testUserId);
    const workerWorkspaceId = workerBiz?.id || "biz_mock";
    await repository.leads.create(workerWorkspaceId, lead);

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

    // ----------------------------------------------------
    // Test Area 9: AI Engine & Cost Controls
    // ----------------------------------------------------
    console.log("  9. Testing AI Engine structured schemas, fallback pathways, and token logs...");
    const { analyzeLeadAndGenerate } = require("./src/services/ai.service");

    const aiInput = {
      leadName: "David",
      businessName: "Acme Corp",
      tone: "professional",
      message: "Hi, how much does the enterprise subscription cost? I need a quote asap."
    };

    // Test template fallback logic
    const analysis = await analyzeLeadAndGenerate(testBizId, aiInput);
    assert.equal(analysis.category, "sales");
    assert.equal(analysis.intent, "pricing inquiry");
    assert.equal(analysis.priority, "high");
    assert.equal(analysis.confidence, 0.70);
    assert.equal(analysis.prompt_version, "v1");
    assert.equal(analysis.provider, "local_fallback");
    assert.ok(analysis.draft.includes("David"));

    // Test token usage tracking database re-entries
    const usageLog = await repository.workspaceAiUsage.create(testBizId, {
      model: "llama-3.3-70b-versatile",
      provider: "groq",
      promptTokens: 120,
      completionTokens: 80,
      totalTokens: 200
    });
    assert.equal(usageLog.provider, "groq");

    const usageSummary = await repository.workspaceAiUsage.getSummary(testBizId);
    assert.equal(usageSummary.promptTokens, 120);
    assert.equal(usageSummary.completionTokens, 80);
    assert.equal(usageSummary.totalTokens, 200);
    assert.equal(usageSummary.requestCount, 1);

    // ----------------------------------------------------
    // Test Area 10: Workflow Engine & Actions execution
    // ----------------------------------------------------
    console.log("  10. Testing workflow engine execution, condition triggers, failure recoveries, and action audits...");
    const { executeTrigger } = require("./src/services/workflow.service");

    const testWorkflowId = `wf_${crypto.randomBytes(8).toString("hex")}`;
    const testWorkflow = {
      id: testWorkflowId,
      workspaceId: testBizId,
      workspace_id: testBizId,
      userId: testUserId,
      name: "Auto Activity Log",
      status: "active",
      triggerKey: "lead.created",
      conditions: [
        { field: "lead.source", operator: "equals", value: "manual" }
      ],
      actions: [
        { type: "create_activity", config: { type: "workflow.test", label: "Workflow execution succeeded" } }
      ]
    };
    await repository.workflows.create(testBizId, testWorkflow);

    // Trigger matching triggerKey and conditions
    const results = await executeTrigger(testBizId, "lead.created", {
      userId: testUserId,
      lead: { id: "lead_test_001", source: "manual" }
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].status, "completed");

    // Verify run record exists
    const runLogs = await repository.workflowRuns.listByWorkflowId(testBizId, testWorkflowId);
    assert.equal(runLogs.length, 1);
    assert.equal(runLogs[0].status, "completed");
    assert.equal(runLogs[0].attemptCount, 1);

    // Test failing workflow
    const failWorkflowId = `wf_${crypto.randomBytes(8).toString("hex")}`;
    const failWorkflow = {
      id: failWorkflowId,
      workspaceId: testBizId,
      workspace_id: testBizId,
      userId: testUserId,
      name: "Failing Action Workflow",
      status: "active",
      triggerKey: "lead.created",
      conditions: [],
      actions: [
        { type: "non_existent_action", config: {} }
      ]
    };
    await repository.workflows.create(testBizId, failWorkflow);

    const failResults = await executeTrigger(testBizId, "lead.created", {
      userId: testUserId,
      lead: { id: "lead_test_002", source: "manual" }
    });
    assert.ok(failResults.some(r => r.status === "failed"));
    
    const failLogs = await repository.workflowRuns.listByWorkflowId(testBizId, failWorkflowId);
    assert.equal(failLogs[0].status, "failed");
    assert.ok(failLogs[0].errorMessage.includes("Unsupported workflow action executor"));

    // Test approval action logging
    const approvalRecord = {
      id: `appr_${crypto.randomBytes(8).toString("hex")}`,
      userId: testUserId,
      workspaceId: testBizId,
      workspace_id: testBizId,
      leadId: "lead_test_001",
      status: "pending",
      kind: "follow_up_draft",
      draft: "Hello",
      createdAt: new Date().toISOString()
    };
    await repository.approvals.create(testBizId, approvalRecord);

    // Invoke controller-level resolveApproval endpoint mock
    const { resolveApproval } = require("./src/controllers/user.controller");
    const mockResObj = {
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
    const mockReqObj = {
      headers: { "x-workspace-id": testBizId },
      body: { notes: "Testing approval action notes" }
    };
    
    // Resolve the approval using direct invoke
    await resolveApproval(mockReqObj, mockResObj, null, { id: testUserId }, approvalRecord.id, "approve", {
      sendGmailFollowUp: async () => ({ provider: "simulation" })
    });
    assert.equal(mockResObj.statusCode, 200);

    // Verify approval_actions entry exists
    const actionLogs = await repository.approvalActions.listByApprovalId(testBizId, approvalRecord.id);
    assert.equal(actionLogs.length, 1);
    assert.equal(actionLogs[0].action, "approved");
    assert.equal(actionLogs[0].notes, "Testing approval action notes");
    assert.equal(actionLogs[0].actorId, testUserId);

    // ----------------------------------------------------
    // Test Area 11: Audit Logs Service & Repository
    // ----------------------------------------------------
    console.log("  11. Testing audit logs compliance creation, state schemas, and retrieval queries...");
    const { logAuditAction } = require("./src/services/auditLog.service");

    const auditRes = await logAuditAction(testBizId, {
      actorId: testUserId,
      entityType: "lead",
      entityId: "lead_test_001",
      action: "lead.created",
      beforeState: { password_hash: "secret_hash_123", access_token: "token123" },
      afterState: { id: "lead_test_001", name: "John Auditor" }
    });

    assert.ok(auditRes);
    assert.equal(auditRes.action, "lead.created");
    assert.equal(auditRes.entityType, "lead");
    assert.equal(auditRes.actorId, testUserId);
    assert.equal(auditRes.actorType, "user");
    assert.equal(auditRes.beforeState.password_hash, "[REDACTED]");
    assert.equal(auditRes.beforeState.access_token, "[REDACTED]");
    assert.equal(auditRes.afterState.name, "John Auditor");

    // Test loop prevention guard
    const loopRes = await logAuditAction(testBizId, {
      entityType: "audit_log",
      entityId: "log_001",
      action: "audit_log.created"
    });
    assert.equal(loopRes, null);

    const auditList = await repository.auditLogs.listByWorkspaceId(testBizId);
    assert.ok(auditList.length >= 1);
    const leadAudit = auditList.find(log => log.entityId === "lead_test_001");
    assert.ok(leadAudit);
    assert.equal(leadAudit.action, "lead.created");
    assert.equal(leadAudit.actorType, "user");

    // ----------------------------------------------------
    // Test Area 12: Notifications Engine
    // ----------------------------------------------------
    console.log("  12. Testing notifications trigger events, read flags, and tenant security...");
    const userController = require("./src/controllers/user.controller");
    const { getNotifications, markNotificationRead, markAllNotificationsRead } = userController;

    // Add workspace membership context first to verify role resolution
    await repository.workspaceMembers.create({
      id: `wmb_${crypto.randomBytes(8).toString("hex")}`,
      workspaceId: testBizId,
      userId: testUserId,
      role: "owner"
    });

    // 1. Verify notification generation upon lead creation (manual lead creation trigger)
    const mockResLead = {
      statusCode: 200,
      writeHead(s) { this.statusCode = s; },
      end(body) { this.body = JSON.parse(body); }
    };
    const mockReqLead = {
      headers: { "x-workspace-id": testBizId },
      body: { name: "Notification Test Lead", email: "notif@test.com", source: "manual" }
    };
    await userController.createLead(mockReqLead, mockResLead, null, { id: testUserId });
    assert.equal(mockResLead.statusCode, 201);

    // 2. Fetch Notifications List and check counts
    const mockResList = {
      statusCode: 200,
      writeHead(s) { this.statusCode = s; },
      end(body) { this.body = JSON.parse(body); }
    };
    const mockReqList = {
      headers: { "x-workspace-id": testBizId },
      url: `/api/notifications?unreadOnly=true`,
      method: "GET"
    };
    await getNotifications(mockReqList, mockResList, null, { id: testUserId });
    assert.equal(mockResList.statusCode, 200);
    assert.ok(mockResList.body.notifications.length >= 2); // should trigger lead_created and approval_required
    assert.equal(mockResList.body.unreadCount, mockResList.body.notifications.length);

    const firstNotif = mockResList.body.notifications[0];
    assert.ok(firstNotif.metadata.leadId);

    // 3. Mark Single Notification as Read
    const mockResRead = {
      statusCode: 200,
      writeHead(s) { this.statusCode = s; },
      end(body) { this.body = JSON.parse(body); }
    };
    const mockReqRead = {
      headers: { "x-workspace-id": testBizId }
    };
    await markNotificationRead(mockReqRead, mockResRead, null, { id: testUserId }, firstNotif.id);
    assert.equal(mockResRead.statusCode, 200);
    assert.equal(mockResRead.body.notification.read, true);

    // Check count decreases
    const mockResList2 = {
      statusCode: 200,
      writeHead(s) { this.statusCode = s; },
      end(body) { this.body = JSON.parse(body); }
    };
    await getNotifications(mockReqList, mockResList2, null, { id: testUserId });
    assert.equal(mockResList2.body.unreadCount, mockResList.body.unreadCount - 1);

    // 4. Mark All Notifications as Read
    const mockResAllRead = {
      statusCode: 200,
      writeHead(s) { this.statusCode = s; },
      end(body) { this.body = JSON.parse(body); }
    };
    const mockReqAllRead = {
      headers: { "x-workspace-id": testBizId }
    };
    await markAllNotificationsRead(mockReqAllRead, mockResAllRead, null, { id: testUserId });
    assert.equal(mockResAllRead.statusCode, 200);

    const mockResList3 = {
      statusCode: 200,
      writeHead(s) { this.statusCode = s; },
      end(body) { this.body = JSON.parse(body); }
    };
    await getNotifications(mockReqList, mockResList3, null, { id: testUserId });
    assert.equal(mockResList3.body.unreadCount, 0);

    // 5. Tenancy Isolation: Trying to query another workspace's notifications
    const foreignBizId = "biz_foreign";
    const mockResListForeign = {
      statusCode: 200,
      writeHead(s) { this.statusCode = s; },
      end(body) { this.body = JSON.parse(body); }
    };
    const mockReqListForeign = {
      headers: { "x-workspace-id": foreignBizId },
      url: `/api/notifications?unreadOnly=true`,
      method: "GET"
    };
    await getNotifications(mockReqListForeign, mockResListForeign, null, { id: testUserId });
    assert.equal(mockResListForeign.body.notifications.length, 0);

    // 13. Static Repository Lint Guard (CI Protection)
    console.log("  13. Testing repository coordinator bypass constraints (CI Guard)...");
    const repoFiles = fs.readdirSync(path.join(__dirname, "src/repositories"));
    for (const file of repoFiles) {
      if (file === "postgres.repository.js" || file === "localJson.repository.js" || file === "mappers.js" || !file.endsWith(".js")) {
        continue;
      }
      const content = fs.readFileSync(path.join(__dirname, "src/repositories", file), "utf8");
      if (content.includes('require("postgres")') || content.includes("require('postgres')") || 
          content.includes('import postgres') || content.includes('from "postgres"') || content.includes("from 'postgres'")) {
        throw new Error(`CI Lint Violation: Repository ${file} directly imports postgres module bypassing the coordinator.`);
      }
    }

    console.log("✅ Zero-Trust Production Audit Test Suite Completed Successfully!");
  } finally {
    fs.rmSync(testStorePath, { force: true });
  }
}

runTests().catch(err => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
