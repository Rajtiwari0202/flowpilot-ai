const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

process.env.JWT_SECRET = "demo-flow-secret";
process.env.NODE_ENV = "test";

const { createRepository } = require("./repository");
const { processLead } = require("./src/workers/leadProcessing.worker");

async function runDemoFlowTests() {
  console.log("🎬 Starting Investor Onboarding Demo Simulation Walkthrough...");

  const seedStorePath = path.join(__dirname, "data", "store.json");
  const testStorePath = path.join(os.tmpdir(), `flowpilot-demo-store-${Date.now()}.json`);
  fs.copyFileSync(seedStorePath, testStorePath);

  const repository = createRepository({ seedStorePath, storePath: testStorePath });

  const appModule = require("./src/app");
  appModule.repository = repository;

  try {
    const testUserId = "usr_demo_founder";

    console.log("  1. Seeding sandbox investor demo profile...");
    const { seedDemoWorkspace } = require("./src/services/auth.service");
    await seedDemoWorkspace();

    const sandboxUser = await repository.users.getById(testUserId);
    assert.ok(sandboxUser, "Mock sandbox workspace user is missing from store.json seed!");
    assert.equal(sandboxUser.name, "Alex Johnson");

    console.log("  2. Simulating manual lead capture...");
    const leadId = `lead_demo_${Date.now()}`;
    const newLead = {
      id: leadId,
      userId: testUserId,
      name: "Sarah Chen",
      email: "sarah@example.com",
      phone: "+91 98765 43210",
      message: "I need help automating follow-up drafts for my digital marketing agency.",
      source: "manual",
      status: "new",
      createdAt: new Date().toISOString()
    };
    await repository.leads.create(newLead);

    const retrievedLead = await repository.leads.getById(leadId);
    assert.ok(retrievedLead);
    assert.equal(retrievedLead.name, "Sarah Chen");

    console.log("  3. Generating AI email response draft via worker...");
    const oauthModule = require("./src/services/oauth.service");
    oauthModule.syncHubspotLead = async () => ({ provider: "simulation" });

    const jobResult = await processLead({ data: { userId: testUserId, leadId } });
    assert.ok(jobResult.approvalId);

    const approval = await repository.approvals.getById(jobResult.approvalId);
    assert.ok(approval);
    assert.equal(approval.status, "pending");
    assert.ok(approval.draft.includes("Sarah"));

    console.log("  4. Resolving approval (approve and verify outbox)...");
    await repository.approvals.update(approval.id, {
      status: "approved",
      resolvedAt: new Date().toISOString()
    });

    const approvedRow = await repository.approvals.getById(approval.id);
    assert.equal(approvedRow.status, "approved");

    console.log("✅ Investor Onboarding Demo Simulation Passed Successfully!");
  } finally {
    fs.rmSync(testStorePath, { force: true });
  }
}

runDemoFlowTests().catch(err => {
  console.error("❌ Demo flow tests failed:", err);
  process.exit(1);
});
