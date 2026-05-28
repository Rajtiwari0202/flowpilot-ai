const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const PORT = 8791;
const baseUrl = `http://localhost:${PORT}`;
const fixtureStore = path.join(process.cwd(), "backend", "data", "store.json");
const testStore = path.join(os.tmpdir(), `flowpilot-store-${Date.now()}.json`);
fs.copyFileSync(fixtureStore, testStore);
const server = spawn(process.execPath, ["backend/server.js"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(PORT), JWT_SECRET: "test-secret", STORE_PATH: testStore },
  stdio: ["ignore", "pipe", "pipe"]
});

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const body = await response.json();
  return { response, body };
}

(async () => {
  try {
    await wait(500);
    const health = await request("/health");
    assert.equal(health.response.status, 200);
    assert.equal(health.body.ok, true);

    const email = `test-${Date.now()}@example.com`;
    const signup = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name: "Test User", email, password: "password123" })
    });
    assert.equal(signup.response.status, 201);
    assert.ok(signup.body.token);

    const auth = { Authorization: `Bearer ${signup.body.token}` };
    const business = await request("/api/onboarding/business", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ name: "Nova Creative Studio", type: "agency", tone: "friendly" })
    });
    assert.equal(business.body.business.name, "Nova Creative Studio");

    const templates = await request("/api/templates?q=lead");
    assert.equal(templates.response.status, 200);
    assert.ok(templates.body.templates.length >= 1);

    const workflow = await request("/api/workflows/from-template", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ templateId: templates.body.templates[0].id })
    });
    assert.equal(workflow.response.status, 201);
    assert.equal(workflow.body.workflow.status, "active");

    const lead = await request("/api/leads", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ name: "Sarah Chen", email: "sarah@example.com", source: "Gmail", message: "Need help with automating lead follow-up." })
    });
    assert.equal(lead.response.status, 201);
    assert.equal(lead.body.approval.status, "pending");

    const dashboard = await request("/api/dashboard", { headers: auth });
    assert.equal(dashboard.response.status, 200);
    assert.equal(dashboard.body.metrics.activeAutomations >= 1, true);
    assert.equal(dashboard.body.metrics.pendingApprovals >= 1, true);

    console.log("Backend smoke tests passed");
  } finally {
    server.kill();
    fs.rmSync(testStore, { force: true });
  }
})().catch((error) => {
  server.kill();
  fs.rmSync(testStore, { force: true });
  console.error(error);
  process.exit(1);
});
