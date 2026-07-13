const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

process.env.JWT_SECRET = "concurrency-audit-secret";
process.env.NODE_ENV = "test";

const { createRepository } = require("./repository");
const { processLead } = require("./src/workers/leadProcessing.worker");
const { getIntegrationAccessToken } = require("./src/services/oauth.service");
const { encryptSecret } = require("./src/utils/crypto");

async function runConcurrencyTests() {
  console.log("⚡ Starting Concurrency & Distributed Lock Test Suite...");

  const seedStorePath = path.join(__dirname, "data", "store.json");
  const testStorePath = path.join(os.tmpdir(), `flowpilot-concurrent-store-${Date.now()}.json`);
  fs.copyFileSync(seedStorePath, testStorePath);

  const repository = createRepository({ seedStorePath, storePath: testStorePath });

  // Isolate repository module exports
  const appModule = require("./src/app");
  appModule.repository = repository;

  try {
    const testUserId = `usr_${crypto.randomBytes(8).toString("hex")}`;
    
    await repository.users.create({
      id: testUserId,
      name: "Concurrency User",
      email: "concurrent@test.com",
      passwordHash: "hash",
      emailVerified: true,
      plan: "free",
      createdAt: new Date().toISOString()
    });

    // ----------------------------------------------------
    // 1. Transaction Lock token refresh race prevention
    // ----------------------------------------------------
    console.log("  1. Testing concurrent token refreshes row-level serialization...");
    
    const expiredIntegration = {
      id: `int_${crypto.randomBytes(8).toString("hex")}`,
      userId: testUserId,
      provider: "gmail",
      status: "connected",
      encryptedCredentials: encryptSecret({
        access_token: "old_access_token",
        refresh_token: "valid_refresh_token",
        expires_in: 3600,
        obtained_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
      }, testUserId),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await repository.integrations.create(expiredIntegration);

    let refreshApiCallCount = 0;
    globalThis.fetch = async (url, options) => {
      refreshApiCallCount++;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          access_token: `new_access_token_${refreshApiCallCount}`,
          expires_in: 3600,
          refresh_token: "valid_refresh_token"
        })
      };
    };

    const promises = [
      getIntegrationAccessToken(expiredIntegration),
      getIntegrationAccessToken(expiredIntegration)
    ];

    const tokens = await Promise.all(promises);
    
    assert.ok(tokens[0]);
    assert.ok(tokens[1]);

    assert.equal(tokens[0], tokens[1]);
    
    assert.equal(refreshApiCallCount, 1);

    // ----------------------------------------------------
    // 2. Concurrent duplicate lead approval writes
    // ----------------------------------------------------
    console.log("  2. Testing database-level concurrent approval unique constraint resolution...");
    
    const leadId = `lead_${crypto.randomBytes(8).toString("hex")}`;
    await repository.leads.create({
      id: leadId,
      userId: testUserId,
      name: "Concurrent Lead",
      email: "lead@concurrent.com",
      message: "Resiliency testing under load.",
      source: "manual",
      status: "new",
      createdAt: new Date().toISOString()
    });

    const oauthModule = require("./src/services/oauth.service");
    oauthModule.syncHubspotLead = async () => ({ provider: "simulation" });

    const p1 = processLead({ data: { userId: testUserId, leadId } });
    const p2 = processLead({ data: { userId: testUserId, leadId } });
    
    const [res1, res2] = await Promise.all([p1, p2]);
    
    assert.equal(res1.approvalId, res2.approvalId);

    const approvals = await repository.approvals.listByUserId(testUserId);
    const count = approvals.filter(a => a.leadId === leadId).length;
    assert.equal(count, 1);

    console.log("✅ Concurrency & Lock Validation Test Suite Passed!");
  } finally {
    fs.rmSync(testStorePath, { force: true });
  }
}

runConcurrencyTests().catch(err => {
  console.error("❌ Concurrency tests failed:", err);
  process.exit(1);
});
