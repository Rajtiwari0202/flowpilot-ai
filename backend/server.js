const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createRepository } = require("./repository");

// Import configurations
const {
  PORT,
  ROOT,
  SEED_STORE_PATH,
  STORE_PATH,
  JWT_SECRET,
  GROQ_MODEL,
  API_PUBLIC_URL,
  APP_ORIGIN,
  MAX_BODY_BYTES,
  PUBLIC_SANDBOX_ENABLED,
  BILLING_DISABLED,
  REAL_EMAIL_SEND_DISABLED,
  JSON_STORE_IN_PRODUCTION_ALLOWED,
  validateEnvironment,
} = require("./src/config/env");

// Import logger
const { structuredLog } = require("./src/utils/logger");

// Import crypto helpers
const {
  hashPassword,
  verifyPassword,
  encryptSecret,
  decryptSecret,
  signaturesMatch,
  tokenHash,
} = require("./src/utils/crypto");

// Import general helpers
const {
  id,
  now,
  clientIp,
  send,
  redirect,
  parseJson,
  readRawBody,
  parseBody,
} = require("./src/utils/helpers");

// Import JWT services
const { signToken, verifyToken } = require("./src/services/jwt.service");

// Import middlewares
const { getAuthUser, enforceAuthGuards } = require("./src/middleware/auth.middleware");
const { enforceRateLimit } = require("./src/middleware/rateLimit.middleware");

// Import controllers
const authController = require("./src/controllers/auth.controller");
const gmailController = require("./src/controllers/gmail.controller");
const userController = require("./src/controllers/user.controller");

// Import services
const { sendGmailFollowUp } = require("./src/services/gmail.service");
const { systemStatus, createLeadApproval, logActivity } = require("./src/services/user.service");

const repository = createRepository({ seedStorePath: SEED_STORE_PATH, storePath: STORE_PATH });

async function readStore() {
  return repository.read();
}

async function writeStore(store) {
  return repository.write(store);
}



async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const store = await readStore();
  store.processedWebhookEvents ||= [];

  if (req.method === "OPTIONS") return send(res, 204, "");
  if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/health") return send(res, 200, { ok: true, service: "flowpilot-api", time: now() });
  if (req.method === "GET" && url.pathname === "/api/system/status") return send(res, 200, systemStatus());

  if (req.method === "HEAD" && url.pathname === "/") return send(res, 200, "");

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/flowdesk_full_frontend.html")) {
    const html = fs.readFileSync(path.join(ROOT, "flowdesk_full_frontend.html"));
    return send(res, 200, html, { "Content-Type": "text/html; charset=utf-8" });
  }

  if (req.method === "GET" && url.pathname === "/favicon.ico") return send(res, 204, "");

  if (req.method === "POST" && url.pathname === "/api/demo/start") {
    return authController.demoStart(req, res, store, { PUBLIC_SANDBOX_ENABLED, writeStore });
  }

  if (req.method === "POST" && url.pathname === "/api/sandbox/start") {
    return authController.sandboxStart(req, res, store, { PUBLIC_SANDBOX_ENABLED, writeStore });
  }

  const leadWebhookMatch = url.pathname.match(/^\/api\/webhooks\/lead\/([^/]+)$/);
  if (req.method === "POST" && leadWebhookMatch) {
    return userController.leadWebhook(req, res, store, leadWebhookMatch[1], { writeStore });
  }

  if (req.method === "GET" && url.pathname === "/api/webhooks/whatsapp") {
    return userController.whatsappVerifyWebhook(req, res, url);
  }

  if (req.method === "POST" && url.pathname === "/api/webhooks/whatsapp") {
    return userController.whatsappWebhook(req, res, store, { writeStore, readRawBody });
  }

  if (req.method === "POST" && url.pathname === "/api/webhooks/razorpay") {
    return userController.razorpayWebhook(req, res, store, { writeStore, readRawBody });
  }

  if (req.method === "GET" && url.pathname === "/api/auth/google") {
    return authController.googleLogin(req, res);
  }

  if (req.method === "GET" && url.pathname === "/api/auth/google/callback") {
    return authController.googleCallback(req, res, store, { logActivity, writeStore, APP_ORIGIN });
  }

  const oauthCallbackMatch = url.pathname.match(/^\/api\/oauth\/(gmail|hubspot)\/callback$/);
  if (req.method === "GET" && oauthCallbackMatch) {
    return userController.integrationCallback(req, res, store, oauthCallbackMatch[1], { APP_ORIGIN, writeStore });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/request-email-verification") {
    return authController.requestEmailVerification(req, res, store, { writeStore });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/verify-email") {
    return authController.verifyEmail(req, res, store, { writeStore });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/request-password-reset") {
    return authController.requestPasswordReset(req, res, store, { writeStore });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/reset-password") {
    return authController.resetPassword(req, res, store, { writeStore });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/signup") {
    return authController.signup(req, res, store, { writeStore, logActivity });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    return authController.login(req, res, store);
  }

  if (req.method === "GET" && url.pathname === "/api/templates") {
    return userController.searchTemplates(req, res, store, url);
  }

  const user = getAuthUser(req, store);
  if (!enforceAuthGuards(req, res, user, url)) return;

  if (req.method === "GET" && url.pathname === "/api/me") {
    return userController.getMe(req, res, store, user);
  }

  if (req.method === "POST" && url.pathname === "/api/demo/reset") {
    return authController.demoReset(req, res, store, { writeStore, user });
  }

  if (req.method === "POST" && url.pathname === "/api/sandbox/reset") {
    return authController.sandboxReset(req, res, store, { writeStore, user });
  }

  if (req.method === "POST" && url.pathname === "/api/onboarding/business") {
    return userController.updateBusiness(req, res, store, user, { writeStore });
  }

  if (req.method === "GET" && url.pathname === "/api/dashboard") {
    return userController.getDashboard(req, res, store, user);
  }

  if (req.method === "GET" && url.pathname === "/api/workflows") {
    return userController.getWorkflows(req, res, store, user);
  }

  if (req.method === "GET" && url.pathname === "/api/leads") {
    return userController.getLeads(req, res, store, user);
  }

  if (req.method === "GET" && url.pathname === "/api/approvals") {
    return userController.getApprovals(req, res, store, user);
  }

  if (req.method === "GET" && url.pathname === "/api/integrations") {
    return userController.getIntegrations(req, res, store, user);
  }

  if (req.method === "POST" && url.pathname === "/api/workflows/from-template") {
    return userController.createWorkflowFromTemplate(req, res, store, user, { writeStore });
  }

  const workflowMatch = url.pathname.match(/^\/api\/workflows\/([^/]+)$/);
  if (req.method === "PATCH" && workflowMatch) {
    return userController.updateWorkflowStatus(req, res, store, user, workflowMatch[1], { writeStore });
  }

  if (req.method === "POST" && url.pathname === "/api/leads") {
    return userController.createLead(req, res, store, user, { writeStore });
  }

  if (req.method === "GET" && url.pathname === "/api/activity") {
    return userController.getActivity(req, res, store, user);
  }

  const approvalMatch = url.pathname.match(/^\/api\/approvals\/([^/]+)\/(approve|reject)$/);
  if (req.method === "POST" && approvalMatch) {
    return userController.resolveApproval(req, res, store, user, approvalMatch[1], approvalMatch[2], { writeStore, sendGmailFollowUp });
  }

  const integrationMatch = url.pathname.match(/^\/api\/integrations\/([^/]+)\/connect$/);
  if (req.method === "POST" && integrationMatch) {
    return userController.connectIntegration(req, res, store, user, integrationMatch[1], { writeStore });
  }

  if (req.method === "POST" && url.pathname === "/api/integrations/gmail/sync") {
    return gmailController.sync(req, res, store, user, { createLeadApproval, writeStore, logActivity });
  }

  if (req.method === "POST" && url.pathname === "/api/ai/draft-follow-up") {
    return userController.generateAIDraft(req, res, store, user);
  }

  if (req.method === "POST" && url.pathname === "/api/billing/subscription") {
    return userController.createBillingSubscription(req, res, store, user, { writeStore, BILLING_DISABLED });
  }

  return send(res, 404, { error: "not found" });
}

const server = http.createServer((req, res) => {
  const startedAt = Date.now();
  res.requestId = req.headers["x-request-id"] || id("req");
  res.on("finish", () => structuredLog("info", "http.request", { requestId: res.requestId, method: req.method, path: req.url, status: res.statusCode, durationMs: Date.now() - startedAt, ip: clientIp(req) }));
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (enforceRateLimit(req, res, url)) return;
  route(req, res).catch((error) => {
    structuredLog("error", "http.error", { requestId: res.requestId, message: error.message, stack: process.env.NODE_ENV === "production" ? undefined : error.stack });
    send(res, error.status || 500, { error: error.status ? error.message : "internal server error" });
  });
});

validateEnvironment();

server.listen(PORT, () => {
  structuredLog("info", "server.started", { port: PORT, repository: repository.mode });
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. The FlowPilot API may already be running.`);
    process.exit(1);
  }
  throw error;
});
