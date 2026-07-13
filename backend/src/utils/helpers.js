const crypto = require("crypto");
const { MAX_BODY_BYTES, APP_ORIGIN } = require("../config/env");

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function now() {
  return new Date().toISOString();
}

function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
}

function send(res, status, payload, headers = {}) {
  const isJson = typeof payload !== "string" && !Buffer.isBuffer(payload);
  res.writeHead(status, {
    "Access-Control-Allow-Origin": APP_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Content-Type": isJson ? "application/json; charset=utf-8" : headers["Content-Type"] || "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'self'; frame-ancestors 'none'; base-uri 'self'",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "X-Request-Id": res.requestId || "",
    ...headers
  });
  res.end(isJson ? JSON.stringify(payload) : payload);
}

function redirect(res, location) {
  res.writeHead(302, { 
    Location: location,
    "Content-Security-Policy": "default-src 'self'; frame-ancestors 'none'; base-uri 'self'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
  });
  res.end();
}

function parseJson(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function readRawBody(req) {
  const chunks = [];
  let size = 0;
  let tooLarge = false;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) tooLarge = true;
    if (!tooLarge) chunks.push(chunk);
  }
  if (tooLarge) {
    const error = new Error("request body is too large");
    error.status = 413;
    throw error;
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function parseBody(req) {
  if (req.body) return req.body;
  return parseJson(await readRawBody(req));
}

module.exports = {
  id,
  now,
  clientIp,
  send,
  redirect,
  parseJson,
  readRawBody,
  parseBody,
};
