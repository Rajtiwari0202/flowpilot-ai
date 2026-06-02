const assert = require("assert");
const crypto = require("crypto");
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
  env: { ...process.env, PORT: String(PORT), JWT_SECRET: "test-secret", STORE_PATH: testStore, GROQ_API_KEY: "", LEAD_WEBHOOK_SECRET: "lead-test-secret", RAZORPAY_WEBHOOK_SECRET: "razor-test-secret", WHATSAPP_VERIFY_TOKEN: "whatsapp-test-secret" },
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

    const status = await request("/api/system/status");
    assert.equal(status.response.status, 200);
    assert.equal(status.body.services.ai.provider, "local");
    assert.equal(status.body.services.leadWebhook.configured, true);

    const whatsappVerification = await fetch(`${baseUrl}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=whatsapp-test-secret&hub.challenge=verified`);
    assert.equal(whatsappVerification.status, 200);
    assert.equal(await whatsappVerification.text(), "verified");

    const email = `test-${Date.now()}@example.com`;
    const signup = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name: "Test User", email, password: "password123" })
    });
    assert.equal(signup.response.status, 201);
    assert.ok(signup.body.token);
    assert.ok(signup.body.developmentToken);

    const auth = { Authorization: `Bearer ${signup.body.token}` };
    const verified = await request("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token: signup.body.developmentToken }) });
    assert.equal(verified.response.status, 200);

    const reusedVerification = await request("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token: signup.body.developmentToken }) });
    assert.equal(reusedVerification.response.status, 400);

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

    const demoConnector = await request("/api/integrations/gmail/connect", { method: "POST", headers: auth, body: "{}" });
    assert.equal(demoConnector.response.status, 200);
    assert.equal(demoConnector.body.mode, "demo");

    const lead = await request("/api/leads", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ name: "Sarah Chen", email: "sarah@example.com", source: "Gmail", message: "Need help with automating lead follow-up." })
    });
    assert.equal(lead.response.status, 201);
    assert.equal(lead.body.approval.status, "pending");

    const leadList = await request("/api/leads", { headers: auth });
    assert.equal(leadList.response.status, 200);
    assert.equal(leadList.body.leads.length, 1);

    const approvalList = await request("/api/approvals", { headers: auth });
    assert.equal(approvalList.response.status, 200);
    assert.equal(approvalList.body.approvals[0].lead.name, "Sarah Chen");

    const approval = await request(`/api/approvals/${lead.body.approval.id}/approve`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ draft: "Edited follow-up draft" })
    });
    assert.equal(approval.response.status, 200);
    assert.equal(approval.body.approval.status, "approved");
    assert.equal(approval.body.approval.draft, "Edited follow-up draft");
    assert.equal(approval.body.approval.deliveryProvider, "simulation");

    const dashboard = await request("/api/dashboard", { headers: auth });
    assert.equal(dashboard.response.status, 200);
    assert.equal(dashboard.body.metrics.activeAutomations >= 1, true);
    assert.equal(dashboard.body.metrics.pendingApprovals, 0);
    assert.equal(dashboard.body.workflows[0].runs, 1);

    const webhookLead = await request(`/api/webhooks/lead/${signup.body.user.id}`, {
      method: "POST",
      headers: { "x-flowpilot-webhook-secret": "lead-test-secret" },
      body: JSON.stringify({ name: "Webhook Lead", email: "webhook@example.com", message: "Please send information.", source: "website" })
    });
    assert.equal(webhookLead.response.status, 201);
    assert.equal(webhookLead.body.approval.aiProvider, "local");

    const webhookPayload = JSON.stringify({ event: "subscription.activated", payload: { subscription: { entity: { id: "sub_test", status: "active", notes: { flowpilot_user_id: signup.body.user.id } } } } });
    const webhookSignature = crypto.createHmac("sha256", "razor-test-secret").update(webhookPayload).digest("hex");
    const razorpay = await request("/api/webhooks/razorpay", {
      method: "POST",
      headers: { "x-razorpay-signature": webhookSignature, "x-razorpay-event-id": "evt_test_1" },
      body: webhookPayload
    });
    assert.equal(razorpay.response.status, 200);

    const duplicateRazorpay = await request("/api/webhooks/razorpay", {
      method: "POST",
      headers: { "x-razorpay-signature": webhookSignature, "x-razorpay-event-id": "evt_test_1" },
      body: webhookPayload
    });
    assert.equal(duplicateRazorpay.body.duplicate, true);

    const passwordReset = await request("/api/auth/request-password-reset", { method: "POST", body: JSON.stringify({ email }) });
    assert.equal(passwordReset.response.status, 200);
    assert.ok(passwordReset.body.developmentToken);

    const changedPassword = await request("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token: passwordReset.body.developmentToken, password: "new-password-123" }) });
    assert.equal(changedPassword.response.status, 200);

    const login = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password: "new-password-123" }) });
    assert.equal(login.response.status, 200);
    assert.ok(login.body.token);

    const oversized = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password: "x".repeat(1024 * 1024 + 100) }) });
    assert.equal(oversized.response.status, 413);

    const demo = await request("/api/demo/start", { method: "POST", body: "{}" });
    assert.equal(demo.response.status, 200);
    assert.ok(demo.body.token);

    const demoAuth = { Authorization: `Bearer ${demo.body.token}` };
    const demoDashboard = await request("/api/dashboard", { headers: demoAuth });
    assert.equal(demoDashboard.response.status, 200);
    assert.equal(demoDashboard.body.user.email, "alex@novacreative.demo");
    assert.equal(demoDashboard.body.metrics.activeAutomations, 2);
    assert.equal(demoDashboard.body.metrics.leadsProcessedToday, 4);
    assert.equal(demoDashboard.body.metrics.pendingApprovals, 1);

    const resetDemo = await request("/api/demo/reset", { method: "POST", headers: demoAuth, body: "{}" });
    assert.equal(resetDemo.response.status, 200);
    assert.ok(resetDemo.body.token);

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
