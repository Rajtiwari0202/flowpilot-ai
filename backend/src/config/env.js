const path = require("path");
const { structuredLog } = require("../utils/logger");

const PORT = Number(process.env.PORT || 8787);
const ROOT = path.resolve(__dirname, "../../..");
const SEED_STORE_PATH = path.join(__dirname, "..", "..", "data", "store.json");
const STORE_PATH = process.env.STORE_PATH || path.join(__dirname, "..", "..", "data", "store.local.json");
const JWT_SECRET = process.env.JWT_SECRET || "flowpilot-local-dev-secret";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const API_PUBLIC_URL = process.env.API_PUBLIC_URL || `http://localhost:${PORT}`;
const APP_ORIGIN = process.env.APP_ORIGIN || "http://localhost:3000";
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 1024 * 1024);
const PUBLIC_SANDBOX_ENABLED = process.env.PUBLIC_SANDBOX_ENABLED !== "false";
const BILLING_DISABLED = process.env.DISABLE_BILLING !== "false";
const REAL_EMAIL_SEND_DISABLED = process.env.DISABLE_REAL_EMAIL_SEND !== "false";
const JSON_STORE_IN_PRODUCTION_ALLOWED = process.env.ALLOW_JSON_STORE_IN_PRODUCTION === "true";

function validateEnvironment() {
  const warnings = [];
  if (JWT_SECRET === "flowpilot-local-dev-secret") warnings.push("JWT_SECRET is using the development fallback");
  if (!process.env.TOKEN_ENCRYPTION_KEY) warnings.push("TOKEN_ENCRYPTION_KEY is falling back to JWT_SECRET");
  if (!process.env.DATABASE_URL && !JSON_STORE_IN_PRODUCTION_ALLOWED) warnings.push("DATABASE_URL is not set; using local JSON storage");
  if (!process.env.DATABASE_URL && JSON_STORE_IN_PRODUCTION_ALLOWED) structuredLog("warn", "environment.warning", { warning: "ALLOW_JSON_STORE_IN_PRODUCTION is enabled; use this only for portfolio sandbox deployments" });
  if (!REAL_EMAIL_SEND_DISABLED && (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL)) warnings.push("Resend account-email delivery is not configured");
  if (APP_ORIGIN.includes("localhost")) warnings.push("APP_ORIGIN still points to localhost");
  if (API_PUBLIC_URL.includes("localhost")) warnings.push("API_PUBLIC_URL still points to localhost");
  if (process.env.NODE_ENV === "production" && warnings.length) {
    for (const warning of warnings) {
      structuredLog("error", "environment.invalid_production_warning", { warning });
    }
  }
  for (const warning of warnings) structuredLog("warn", "environment.warning", { warning });
}

module.exports = {
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
};
