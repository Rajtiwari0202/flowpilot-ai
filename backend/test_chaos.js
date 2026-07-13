const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

// Mock environment variables
process.env.JWT_SECRET = "chaos-audit-secret";
process.env.NODE_ENV = "test";

const { createRepository } = require("./repository");
const { processLead } = require("./src/workers/leadProcessing.worker");
const { listGmailInboxMessages } = require("./src/services/gmail.service");

async function runChaosTests() {
  console.log("🌪️ Starting Chaos and Resiliency Test Suite...");

  const seedStorePath = path.join(__dirname, "data", "store.json");
  const testStorePath = path.join(os.tmpdir(), `flowpilot-chaos-store-${Date.now()}.json`);
  fs.copyFileSync(seedStorePath, testStorePath);

  const repository = createRepository({ seedStorePath, storePath: testStorePath });

  // Isolate repository module exports
  const appModule = require("./src/app");
  appModule.repository = repository;

  try {
    // ----------------------------------------------------
    // 1. Gmail Outage Retry Simulation
    // ----------------------------------------------------
    console.log("  1. Simulating Gmail outage and rate limiting...");
    let callCount = 0;
    globalThis.fetch = async (url) => {
      callCount++;
      if (callCount < 3) {
        return { ok: false, status: 429 };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ messages: [{ id: "chaos_msg" }] })
      };
    };

    const messages = await listGmailInboxMessages("token", "in:inbox", 1);
    assert.equal(messages.length, 1);
    assert.equal(messages[0].id, "chaos_msg");
    assert.equal(callCount, 3);

    // ----------------------------------------------------
    // 2. HubSpot Outage Workflow Resiliency
    // ----------------------------------------------------
    console.log("  2. Simulating HubSpot CRM outage during lead processing...");
    const userId = `usr_${crypto.randomBytes(8).toString("hex")}`;
    const leadId = `lead_${crypto.randomBytes(8).toString("hex")}`;
    
    await repository.users.create({
      id: userId,
      name: "Chaos User",
      email: "chaos@test.com",
      passwordHash: "hash",
      emailVerified: true,
      plan: "free",
      createdAt: new Date().toISOString()
    });

    await repository.leads.create({
      id: leadId,
      userId,
      name: "Chaos Lead",
      email: "lead@chaos.com",
      message: "Resiliency testing",
      source: "Gmail",
      status: "new",
      createdAt: new Date().toISOString()
    });

    const oauthModule = require("./src/services/oauth.service");
    const originalSyncHubspotLead = oauthModule.syncHubspotLead;
    oauthModule.syncHubspotLead = async () => {
      throw new Error("HubSpot API Gateway Timeout (504)");
    };

    const jobResult = await processLead({ data: { userId, leadId } });
    assert.ok(jobResult.approvalId);

    const approval = await repository.approvals.getById(jobResult.approvalId);
    assert.equal(approval.status, "pending");

    oauthModule.syncHubspotLead = originalSyncHubspotLead;

    // ----------------------------------------------------
    // 3. Duplicate Worker Delivery (Idempotency)
    // ----------------------------------------------------
    console.log("  3. Simulating concurrent duplicate job delivery...");
    
    const p1 = processLead({ data: { userId, leadId } });
    const p2 = processLead({ data: { userId, leadId } });
    
    const [res1, res2] = await Promise.all([p1, p2]);
    assert.equal(res1.approvalId, res2.approvalId);

    const approvals = await repository.approvals.listByUserId(userId);
    const count = approvals.filter(a => a.leadId === leadId).length;
    assert.equal(count, 1);

    console.log("✅ Chaos and Resiliency Test Suite Completed Successfully!");
  } finally {
    fs.rmSync(testStorePath, { force: true });
  }
}

runChaosTests().catch(err => {
  console.error("❌ Chaos tests failed:", err);
  process.exit(1);
});
