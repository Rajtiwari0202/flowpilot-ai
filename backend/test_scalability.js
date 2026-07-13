const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

process.env.JWT_SECRET = "scalability-audit-secret";
process.env.NODE_ENV = "test";

const { createRepository } = require("./repository");

async function runScalabilityTests() {
  console.log("📈 Starting Scalability & Memory Performance Test Suite...");

  const seedStorePath = path.join(__dirname, "data", "store.json");
  const testStorePath = path.join(os.tmpdir(), `flowpilot-scale-store-${Date.now()}.json`);
  fs.copyFileSync(seedStorePath, testStorePath);

  const repository = createRepository({ seedStorePath, storePath: testStorePath });

  try {
    // ----------------------------------------------------
    // 1. Memory Consumption / Pagination efficiency
    // ----------------------------------------------------
    console.log("  1. Seeding 5,000 mock leads to verify memory and paging overhead...");
    
    const initialMemory = process.memoryUsage().heapUsed;

    const mockLeads = [];
    const testUserId = "usr_scale_test";
    
    await repository.users.create({
      id: testUserId,
      name: "Scale User",
      email: "scale@test.com",
      passwordHash: "hash",
      emailVerified: true,
      plan: "free",
      createdAt: new Date().toISOString()
    });

    for (let i = 0; i < 5000; i++) {
      mockLeads.push({
        id: `lead_${i}`,
        userId: testUserId,
        name: `Lead ${i}`,
        email: `lead_${i}@scale.com`,
        phone: null,
        message: "Check scalability limit.",
        source: "manual",
        status: "new",
        createdAt: new Date().toISOString()
      });
    }

    await Promise.all(mockLeads.map(l => repository.leads.create(l)));

    const memoryAfterSeeding = process.memoryUsage().heapUsed;
    const seedingOverhead = memoryAfterSeeding - initialMemory;
    console.log(`     Memory overhead after seeding: ${(seedingOverhead / (1024 * 1024)).toFixed(2)} MB`);

    const fetchedLeads = await repository.leads.listByUserId(testUserId);
    assert.equal(fetchedLeads.length, 5000);

    const memoryAfterQuery = process.memoryUsage().heapUsed;
    const queryOverhead = memoryAfterQuery - memoryAfterSeeding;
    console.log(`     Query overhead memory growth: ${(queryOverhead / (1024 * 1024)).toFixed(2)} MB`);
    
    assert.ok(queryOverhead < 50 * 1024 * 1024, "Memory growth exceeds acceptable limits!");

    console.log("✅ Scalability Validation Test Suite Passed!");
  } finally {
    fs.rmSync(testStorePath, { force: true });
  }
}

runScalabilityTests().catch(err => {
  console.error("❌ Scalability tests failed:", err);
  process.exit(1);
});
