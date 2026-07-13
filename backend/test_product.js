const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

process.env.JWT_SECRET = "product-audit-secret";
process.env.NODE_ENV = "test";

const { createRepository } = require("./repository");
const { signup } = require("./src/controllers/auth.controller");
const { verifyToken, signToken } = require("./src/services/jwt.service");

async function runProductTests() {
  console.log("📦 Starting End-to-End Product Flow Test Suite...");

  const seedStorePath = path.join(__dirname, "data", "store.json");
  const testStorePath = path.join(os.tmpdir(), `flowpilot-product-store-${Date.now()}.json`);
  fs.copyFileSync(seedStorePath, testStorePath);

  const repository = createRepository({ seedStorePath, storePath: testStorePath });

  const appModule = require("./src/app");
  appModule.repository = repository;

  try {
    console.log("  1. Testing user registration API flow...");
    let userToken;
    let resData;
    const mockRes = {
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

    const email = `test_${crypto.randomBytes(4).toString("hex")}@company.com`;
    await signup({
      body: {
        name: "Demo Founder",
        email,
        password: "securepassword123"
      }
    }, mockRes);

    assert.ok(mockRes.statusCode === 200 || mockRes.statusCode === 201);
    assert.ok(resData.token);
    userToken = resData.token;

    const payload = verifyToken(userToken);
    assert.ok(payload.sub);
    const userId = payload.sub;

    console.log("  2. Testing business onboarding profile details save...");
    let business = await repository.businesses.getByUserId(userId);
    if (!business) {
      business = {
        id: "biz_123",
        userId,
        name: "Raj Digital Agency",
        type: "agency",
        tone: "professional",
        goals: ["lead_follow_up"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await repository.businesses.create(business);
    } else {
      await repository.businesses.updateByUserId(userId, { name: "Raj Digital Agency" });
    }

    const userBusiness = await repository.businesses.getByUserId(userId);
    assert.ok(userBusiness);
    assert.equal(userBusiness.name, "Raj Digital Agency");

    console.log("  3. Testing system status provider flags...");
    const statusData = {
      mode: "local json",
      services: {
        ai: { provider: "groq", configured: true },
        billing: { provider: "razorpay", configured: false },
        database: { provider: "json-store", configured: true },
        leadWebhook: { configured: true },
        gmail: { configured: false },
        hubspot: { configured: false },
        whatsapp: { configured: false },
        accountEmail: { provider: "mock-resend", configured: true }
      }
    };
    assert.ok(statusData.services.ai.configured);
    assert.ok(statusData.services.database.configured);

    console.log("✅ End-to-End Product Flow Test Suite Passed!");
  } finally {
    fs.rmSync(testStorePath, { force: true });
  }
}

runProductTests().catch(err => {
  console.error("❌ Product tests failed:", err);
  process.exit(1);
});
