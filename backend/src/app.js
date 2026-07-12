const { createRepository } = require("../repository");
const { SEED_STORE_PATH, STORE_PATH, PUBLIC_SANDBOX_ENABLED, BILLING_DISABLED, APP_ORIGIN } = require("./config/env");
const { structuredLog } = require("./utils/logger");
const { enforceRateLimit } = require("./middleware/rateLimit.middleware");
const { clientIp, id, send, readRawBody } = require("./utils/helpers");
const mainRouter = require("./routes");

const repository = createRepository({ seedStorePath: SEED_STORE_PATH, storePath: STORE_PATH });

async function readStore() {
  return repository.read();
}

async function writeStore(store) {
  return repository.write(store);
}

async function handleRequest(req, res) {
  const startedAt = Date.now();
  res.requestId = req.headers["x-request-id"] || id("req");
  res.on("finish", () =>
    structuredLog("info", "http.request", {
      requestId: res.requestId,
      method: req.method,
      path: req.url,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
      ip: clientIp(req)
    })
  );

  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (enforceRateLimit(req, res, url)) return;

    const store = await readStore();
    store.processedWebhookEvents ||= [];

    const { logActivity, createLeadApproval } = require("./services/user.service");
    const { sendGmailFollowUp } = require("./services/gmail.service");

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
  } catch (error) {
    structuredLog("error", "http.error", {
      requestId: res.requestId,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack
    });
    send(res, error.status || 500, { error: error.status ? error.message : "internal server error" });
  }
}

module.exports = {
  handleRequest,
  repository,
};
