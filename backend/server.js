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

const { enforceRateLimit } = require("./src/middleware/rateLimit.middleware");
const mainRouter = require("./src/routes");

const repository = createRepository({ seedStorePath: SEED_STORE_PATH, storePath: STORE_PATH });

async function readStore() {
  return repository.read();
}

async function writeStore(store) {
  return repository.write(store);
}



async function route(req, res) {
  const store = await readStore();
  store.processedWebhookEvents ||= [];

  const { logActivity, createLeadApproval } = require("./src/services/user.service");
  const { sendGmailFollowUp } = require("./src/services/gmail.service");
  const { PUBLIC_SANDBOX_ENABLED, BILLING_DISABLED, APP_ORIGIN } = require("./src/config/env");

  await mainRouter(req, res, store, {
    PUBLIC_SANDBOX_ENABLED,
    BILLING_DISABLED,
    APP_ORIGIN,
    writeStore,
    readRawBody,
    logActivity,
    createLeadApproval,
    sendGmailFollowUp,
  });
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
