const crypto = require("crypto");
const { structuredLog } = require("../utils/logger");

async function captureEvent(distinctId, eventName, properties = {}) {
  const key = process.env.POSTHOG_API_KEY;
  if (!key) return;
  const host = process.env.POSTHOG_HOST || "https://us.i.posthog.com";

  try {
    fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event: eventName,
        properties: {
          distinct_id: distinctId,
          ...properties
        },
        timestamp: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(5000)
    }).catch(err => {
      structuredLog("warn", "observability.posthog.failed", { error: err.message });
    });
  } catch (err) {
    // Ignore
  }
}

async function captureException(error, context = {}) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  try {
    const match = dsn.match(/https:\/\/([^@]+)@([^/]+)\/(.+)/);
    if (!match) return;
    const [, publicKey, host, projectId] = match;

    const payload = {
      event_id: crypto.randomBytes(16).toString("hex"),
      timestamp: new Date().toISOString(),
      platform: "node",
      logger: "flowpilot-observability",
      exception: {
        values: [{
          type: error.name || "Error",
          value: error.message || String(error),
          stacktrace: error.stack ? { raw: error.stack } : undefined
        }]
      },
      extra: context
    };

    fetch(`https://${host}/api/${projectId}/store/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=flowpilot-client/1.0`
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000)
    }).catch(err => {
      structuredLog("warn", "observability.sentry.failed", { error: err.message });
    });
  } catch (err) {
    // Ignore
  }
}

module.exports = {
  captureEvent,
  captureException
};
