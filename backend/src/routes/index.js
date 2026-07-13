const fs = require("fs");
const path = require("path");
const authRoutes = require("./auth.routes");
const gmailRoutes = require("./gmail.routes");
const usersRoutes = require("./users.routes");
const integrationsRoutes = require("./integrations.routes");
const { systemStatus } = require("../services/user.service");
const { send, now } = require("../utils/helpers");
const { ROOT } = require("../config/env");

async function route(req, res, store, context) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    send(res, 204, "");
    return true;
  }
  if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/health") {
    send(res, 200, { ok: true, service: "flowpilot-api", time: now() });
    return true;
  }
  if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/health/live") {
    send(res, 200, { status: "ok", time: now() });
    return true;
  }
  if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/health/ready") {
    try {
      const { repository } = require("../app");
      const { getRedisConnection } = require("../services/queue.service");

      if (repository.mode === "supabase_postgres") {
        await repository.users.list();
      }

      const conn = getRedisConnection();
      if (conn) {
        await conn.ping();
      }

      send(res, 200, { status: "ready", database: "ok", redis: conn ? "ok" : "mock", time: now() });
    } catch (err) {
      send(res, 503, { status: "unready", error: err.message, time: now() });
    }
    return true;
  }
  if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/health/deep") {
    try {
      const { repository } = require("../app");
      const { getRedisConnection } = require("../services/queue.service");

      if (repository.mode === "supabase_postgres") {
        await repository.users.list();
      }

      const conn = getRedisConnection();
      if (conn) {
        await conn.ping();
      }

      const externalApis = {
        gmail: !!process.env.GMAIL_CLIENT_ID,
        hubspot: !!process.env.HUBSPOT_CLIENT_ID,
        resend: !!process.env.RESEND_API_KEY
      };

      send(res, 200, {
        status: "healthy",
        database: "ok",
        redis: conn ? "ok" : "mock",
        externalApis,
        time: now()
      });
    } catch (err) {
      send(res, 503, { status: "unhealthy", error: err.message, time: now() });
    }
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/system/status") {
    send(res, 200, systemStatus());
    return true;
  }
  if (req.method === "HEAD" && url.pathname === "/") {
    send(res, 200, "");
    return true;
  }
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/flowdesk_full_frontend.html")) {
    const html = fs.readFileSync(path.join(ROOT, "flowdesk_full_frontend.html"));
    send(res, 200, html, { "Content-Type": "text/html; charset=utf-8" });
    return true;
  }
  if (req.method === "GET" && url.pathname === "/favicon.ico") {
    send(res, 204, "");
    return true;
  }

  if (await authRoutes(req, res, url, store, context)) return true;
  if (await gmailRoutes(req, res, url, store, context)) return true;
  if (await integrationsRoutes(req, res, url, store, context)) return true;
  if (await usersRoutes(req, res, url, store, context)) return true;

  send(res, 404, { error: "not found" });
  return true;
}

module.exports = route;
