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

const repository = createRepository({ seedStorePath: SEED_STORE_PATH, storePath: STORE_PATH });

async function readStore() {
  return repository.read();
}

async function writeStore(store) {
  return repository.write(store);
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function logActivity(store, item) {
  const row = {
    id: id("act"),
    createdAt: now(),
    status: "success",
    ...item
  };
  store.activity.unshift(row);
  return row;
}

function getUserBusiness(store, userId) {
  return store.businesses.find((business) => business.userId === userId) || null;
}

function dashboardFor(store, user) {
  const business = getUserBusiness(store, user.id);
  const workflows = store.workflows.filter((workflow) => workflow.userId === user.id);
  const leads = store.leads.filter((lead) => lead.userId === user.id);
  const activity = store.activity.filter((item) => item.userId === user.id).slice(0, 10);
  const approvals = store.approvals.filter((approval) => approval.userId === user.id && approval.status === "pending");
  const errors = activity.filter((item) => item.status === "error");
  return {
    user: publicUser(user),
    business,
    metrics: {
      activeAutomations: workflows.filter((workflow) => workflow.status === "active").length,
      leadsProcessedToday: leads.length,
      pendingApprovals: approvals.length,
      errors: errors.length,
      timeSavedMinutesThisWeek: leads.length * 12,
      successRate: activity.length ? Math.round((activity.length - errors.length) / activity.length * 100) : 100
    },
    workflows,
    activity,
    approvals
  };
}


function issueAccountToken(store, user, kind, ttlMinutes) {
  const token = crypto.randomBytes(32).toString("hex");
  store.authTokens = (store.authTokens || []).filter((item) => !(item.userId === user.id && item.kind === kind && !item.usedAt));
  store.authTokens.push({ id: id("tok"), userId: user.id, kind, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString(), createdAt: now() });
  return token;
}

function consumeAccountToken(store, token, kind) {
  const row = (store.authTokens || []).find((item) => item.kind === kind && item.tokenHash === tokenHash(String(token || "")) && !item.usedAt && new Date(item.expiresAt).getTime() > Date.now());
  if (!row) return null;
  row.usedAt = now();
  return store.users.find((item) => item.id === row.userId) || null;
}

function queueAccountEmail(store, user, kind, token) {
  const path = kind === "verify_email" ? "verify-email" : "reset-password";
  const row = { id: id("mail"), userId: user.id, to: user.email, kind, status: "queued", link: `${APP_ORIGIN}/?${path}=${token}`, createdAt: now() };
  store.outbox ||= [];
  store.outbox.push(row);
  structuredLog("info", "email.queued", { kind, userId: user.id });
  return row;
}

async function deliverAccountEmail(row) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": row.id,
      "User-Agent": "flowpilot-api/0.1"
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [row.to],
      subject: row.kind === "verify_email" ? "Verify your FlowPilot email" : "Reset your FlowPilot password",
      text: `Open this link to continue: ${row.link}`
    }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Resend email failed: ${response.status}`);
  row.status = "sent";
  row.sentAt = now();
}

function developmentToken(token) {
  return process.env.NODE_ENV === "production" ? {} : { developmentToken: token };
}


function upsertIntegration(store, userId, provider, values = {}) {
  let integration = store.integrations.find((item) => item.userId === userId && item.provider === provider);
  if (!integration) {
    integration = { id: id("int"), userId, provider, createdAt: now() };
    store.integrations.push(integration);
  }
  Object.assign(integration, values, { updatedAt: now() });
  return integration;
}

function oauthRedirectUri(provider) {
  return `${API_PUBLIC_URL}/api/oauth/${provider}/callback`;
}

function integrationConfig(provider) {
  if (provider === "gmail") return { clientId: process.env.GMAIL_CLIENT_ID, clientSecret: process.env.GMAIL_CLIENT_SECRET };
  if (provider === "hubspot") return { clientId: process.env.HUBSPOT_CLIENT_ID, clientSecret: process.env.HUBSPOT_CLIENT_SECRET };
  return {};
}

function oauthAuthorizationUrl(provider, userId) {
  const config = integrationConfig(provider);
  if (!config.clientId || !config.clientSecret) return null;
  const state = signToken({ sub: userId, provider });
  if (provider === "gmail") {
    const params = new URLSearchParams({ client_id: config.clientId, redirect_uri: oauthRedirectUri(provider), response_type: "code", access_type: "offline", prompt: "consent", scope: "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly", state });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }
  if (provider === "hubspot") {
    const params = new URLSearchParams({ client_id: config.clientId, redirect_uri: oauthRedirectUri(provider), scope: "crm.objects.contacts.read crm.objects.contacts.write", state });
    return `https://app.hubspot.com/oauth/authorize?${params}`;
  }
  return null;
}

async function exchangeOauthCode(provider, code) {
  const config = integrationConfig(provider);
  const values = { code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: oauthRedirectUri(provider), grant_type: "authorization_code" };
  const endpoint = provider === "gmail" ? "https://oauth2.googleapis.com/token" : "https://api.hubapi.com/oauth/v3/token";
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(values), signal: AbortSignal.timeout(12000) });
  const tokens = await response.json();
  if (!response.ok) throw new Error(tokens.error_description || tokens.error || `${provider} OAuth exchange failed`);
  return { ...tokens, obtainedAt: Date.now() };
}

async function getIntegrationAccessToken(integration) {
  const tokens = decryptSecret(integration.encryptedCredentials);
  if (!tokens?.access_token) return null;
  const expiresAt = Number(tokens.obtainedAt || 0) + Number(tokens.expires_in || 0) * 1000;
  if (!tokens.refresh_token || !tokens.expires_in || expiresAt > Date.now() + 60000) return tokens.access_token;
  const config = integrationConfig(integration.provider);
  const endpoint = integration.provider === "gmail" ? "https://oauth2.googleapis.com/token" : "https://api.hubapi.com/oauth/v3/token";
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, refresh_token: tokens.refresh_token, grant_type: "refresh_token" }), signal: AbortSignal.timeout(12000) });
  const refreshed = await response.json();
  if (!response.ok) throw new Error(`${integration.provider} token refresh failed`);
  integration.encryptedCredentials = encryptSecret({ ...tokens, ...refreshed, refresh_token: refreshed.refresh_token || tokens.refresh_token, obtainedAt: Date.now() });
  integration.updatedAt = now();
  return refreshed.access_token;
}

function encodeEmail({ to, subject, body }) {
  return Buffer.from(`To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}`).toString("base64url");
}

async function sendGmailFollowUp(store, user, lead, draft) {
  if (REAL_EMAIL_SEND_DISABLED || user.id === "usr_demo_founder" || !lead?.email) return { provider: "simulation" };
  const integration = store.integrations.find((item) => item.userId === user.id && item.provider === "gmail" && item.status === "connected" && item.encryptedCredentials);
  if (!integration) return { provider: "simulation" };
  const accessToken = await getIntegrationAccessToken(integration);
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: encodeEmail({ to: lead.email, subject: `Following up from ${getUserBusiness(store, user.id)?.name || "our team"}`, body: draft }) }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Gmail send failed: ${response.status}`);
  return { provider: "gmail", message: await response.json() };
}

function parseGmailFromHeader(value = "") {
  const trimmed = value.trim();
  const match = trimmed.match(/^(.*?)<(.+)>$/);
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, "");
    const email = match[2].trim();
    return { name: name || email, email };
  }
  return { name: trimmed, email: trimmed };
}

async function listGmailInboxMessages(accessToken, query) {
  const params = new URLSearchParams({ q: query, maxResults: "15" });
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Gmail inbox list failed: ${response.status}`);
  const data = await response.json();
  return data.messages || [];
}

async function getGmailMessage(accessToken, messageId) {
  const params = new URLSearchParams({ format: "metadata" });
  params.append("metadataHeaders", "From");
  params.append("metadataHeaders", "Subject");
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Gmail message fetch failed: ${response.status}`);
  return response.json();
}

async function syncGmailInbox(store, user) {
  const integration = store.integrations.find((item) => item.userId === user.id && item.provider === "gmail" && item.status === "connected" && item.encryptedCredentials);
  if (!integration) {
    const error = new Error("Gmail is not connected for this account");
    error.status = 400;
    throw error;
  }

  const accessToken = await getIntegrationAccessToken(integration);
  if (!accessToken) {
    const error = new Error("Gmail access token is unavailable; reconnect Gmail in Integrations");
    error.status = 400;
    throw error;
  }

  const alreadyCaptured = new Set(
    store.leads.filter((lead) => lead.userId === user.id && lead.gmailMessageId).map((lead) => lead.gmailMessageId)
  );

  const refs = await listGmailInboxMessages(accessToken, "in:inbox -in:chats -category:promotions -category:social newer_than:7d");
  const createdLeads = [];

  for (const ref of refs) {
    if (alreadyCaptured.has(ref.id)) continue;
    let message;
    try {
      message = await getGmailMessage(accessToken, ref.id);
    } catch (error) {
      console.error("Gmail message fetch:", error.message);
      continue;
    }
    const headers = Object.fromEntries((message.payload?.headers || []).map((header) => [header.name, header.value]));
    const sender = parseGmailFromHeader(headers.From || "");
    const subject = headers.Subject || "New inbox inquiry";
    const summary = message.snippet || subject;

    const { lead } = await createLeadApproval(store, user, {
      name: sender.name,
      email: sender.email,
      message: `${subject}: ${summary}`,
      source: "Gmail"
    });
    lead.gmailMessageId = ref.id;
    createdLeads.push(lead);
    if (createdLeads.length >= 10) break;
  }

  await writeStore(store);
  return createdLeads;
}

async function syncHubspotLead(store, user, lead) {
  if (user.id === "usr_demo_founder") return { provider: "simulation" };
  const integration = store.integrations.find((item) => item.userId === user.id && item.provider === "hubspot" && item.status === "connected" && item.encryptedCredentials);
  if (!integration) return { provider: "simulation" };
  const accessToken = await getIntegrationAccessToken(integration);
  const response = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ properties: { email: lead.email || "", firstname: lead.name, phone: lead.phone || "" } }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok && response.status !== 409) throw new Error(`HubSpot contact sync failed: ${response.status}`);
  return { provider: "hubspot" };
}

function userRows(store, collection, userId) {
  return store[collection].filter((item) => item.userId === userId);
}

function fallbackDraftFollowUp({ leadName = "there", businessName = "our team", tone = "professional", message = "" }) {
  const opener = tone === "friendly" ? "Thanks so much for reaching out" : "Thank you for your inquiry";
  const detail = message ? ` I saw your note about "${message.slice(0, 120)}".` : "";
  return `${opener}, ${leadName}.${detail} ${businessName} can help with this. Would you be open to a quick call so we can understand your needs and suggest the best next step?`;
}

async function draftFollowUp(input) {
  const fallback = fallbackDraftFollowUp(input);
  if (!process.env.GROQ_API_KEY) return { draft: fallback, provider: "local" };

  const prompt = [
    `Write a concise ${input.tone || "professional"} lead follow-up email.`,
    `Business: ${input.businessName || "our team"}.`,
    `Lead: ${input.leadName || "there"}.`,
    `Inquiry: ${input.message || "No inquiry details provided."}`,
    "Return only the email body. Keep it under 140 words. Suggest a short call as the next step."
  ].join("\n");

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: "You write clear, human business follow-up emails. Never invent facts." },
          { role: "user", content: prompt }
        ],
        temperature: 0.4,
        max_completion_tokens: 240
      }),
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error(`Groq request failed: ${response.status}`);
    const data = await response.json();
    const draft = data.choices?.[0]?.message?.content?.trim();
    if (!draft) throw new Error("Groq returned an empty draft");
    return { draft, provider: "groq" };
  } catch (error) {
    console.error("Groq draft fallback:", error.message);
    return { draft: fallback, provider: "local_fallback" };
  }
}

function systemStatus() {
  return {
    mode: process.env.NODE_ENV === "production" ? "production" : "development",
    services: {
      publicSandbox: { enabled: PUBLIC_SANDBOX_ENABLED },
      ai: { provider: process.env.GROQ_API_KEY ? "groq" : "local", configured: Boolean(process.env.GROQ_API_KEY) },
      billing: { provider: "razorpay", configured: !BILLING_DISABLED && Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_PLAN_ID), disabled: BILLING_DISABLED },
      database: { provider: process.env.DATABASE_URL ? "supabase_postgres" : "local_json", configured: Boolean(process.env.DATABASE_URL) },
      leadWebhook: { configured: Boolean(process.env.LEAD_WEBHOOK_SECRET) },
      gmail: { configured: Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET) },
      hubspot: { configured: Boolean(process.env.HUBSPOT_CLIENT_ID && process.env.HUBSPOT_CLIENT_SECRET) },
      whatsapp: { configured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_VERIFY_TOKEN && process.env.WHATSAPP_APP_SECRET && process.env.WHATSAPP_OWNER_USER_ID) },
      accountEmail: { provider: process.env.RESEND_API_KEY ? "resend" : "local_outbox", configured: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) }
    }
  };
}

async function createLeadApproval(store, user, body) {
  const lead = {
    id: id("lead"),
    userId: user.id,
    name: body.name || "New lead",
    email: body.email || null,
    phone: body.phone || null,
    message: body.message || "",
    source: body.source || "manual",
    status: "new",
    createdAt: now()
  };
  store.leads.unshift(lead);
  const business = getUserBusiness(store, user.id);
  const generated = await draftFollowUp({ leadName: lead.name, businessName: business?.name, tone: business?.tone, message: lead.message });
  const approval = { id: id("appr"), userId: user.id, leadId: lead.id, status: "pending", kind: "follow_up_draft", draft: generated.draft, aiProvider: generated.provider, createdAt: now() };
  store.approvals.unshift(approval);
  logActivity(store, { userId: user.id, type: "lead.created", label: `${lead.name} awaiting approval`, source: lead.source, status: "pending" });
  try {
    const sync = await syncHubspotLead(store, user, lead);
    if (sync.provider === "hubspot") logActivity(store, { userId: user.id, type: "integration.synced", label: `${lead.name} synced to HubSpot`, source: "hubspot" });
  } catch (error) {
    console.error("HubSpot sync:", error.message);
    logActivity(store, { userId: user.id, type: "integration.error", label: `${lead.name} could not sync to HubSpot`, source: "hubspot", status: "error" });
  }
  await writeStore(store);
  return { lead, approval };
}


async function seedDemoWorkspace(store) {
  const userId = "usr_demo_founder";
  const createdAt = now();
  const removeOwnedRows = (collection) => {
    store[collection] = store[collection].filter((item) => item.userId !== userId);
  };

  store.users = store.users.filter((item) => item.id !== userId);
  ["businesses", "integrations", "workflows", "leads", "activity", "approvals"].forEach(removeOwnedRows);

  const user = { id: userId, name: "Alex Johnson", email: "alex@novacreative.demo", passwordHash: hashPassword("flowpilot-demo"), emailVerified: true, plan: "free", createdAt };
  store.users.push(user);
  store.businesses.push({ id: "biz_demo_agency", userId, name: "Nova Creative Studio", type: "agency", tone: "friendly", goals: ["lead_follow_up"], createdAt, updatedAt: createdAt });
  store.integrations.push(
    { id: "int_demo_gmail", userId, provider: "gmail", status: "connected", createdAt, updatedAt: createdAt },
    { id: "int_demo_hubspot", userId, provider: "hubspot", status: "connected", createdAt, updatedAt: createdAt }
  );
  store.workflows.push(
    { id: "wf_demo_follow_up", userId, templateId: "tpl_lead_follow_up", name: "Lead Follow-up", status: "active", trigger: "lead.created", actions: ["classify_lead", "draft_reply", "request_approval", "send_email"], runs: 1245, createdAt, updatedAt: createdAt },
    { id: "wf_demo_crm", userId, templateId: "tpl_crm_auto_update", name: "CRM Auto-Update", status: "active", trigger: "lead.updated", actions: ["normalize_contact", "update_crm", "log_activity"], runs: 836, createdAt, updatedAt: createdAt }
  );
  store.leads.push(
    { id: "lead_demo_sarah", userId, name: "Sarah Chen", email: "sarah@northstar.co", phone: "+91 98765 43210", message: "We need a lead follow-up system for our consulting team.", source: "Gmail", status: "pending_approval", createdAt },
    { id: "lead_demo_mia", userId, name: "Mia Torres", email: "mia@brightpath.io", phone: null, message: "Interested in your design retainer plans.", source: "Website form", status: "follow_up_sent", createdAt },
    { id: "lead_demo_raj", userId, name: "Raj Patel", email: "raj@scalehouse.in", phone: "+91 99887 77665", message: "Can your team help us redesign our SaaS onboarding?", source: "Gmail", status: "follow_up_sent", createdAt },
    { id: "lead_demo_priya", userId, name: "Priya Sharma", email: "priya@launchbox.in", phone: null, message: "Looking for a brand refresh before our next launch.", source: "Website form", status: "follow_up_sent", createdAt }
  );
  store.approvals.push({ id: "appr_demo_sarah", userId, leadId: "lead_demo_sarah", status: "pending", kind: "follow_up_draft", draft: "Hi Sarah,\n\nThanks so much for reaching out. I saw your note about setting up a lead follow-up system for your consulting team. Nova Creative Studio can help map the workflow and create a polished customer experience around it.\n\nWould you be open to a quick 20-minute call this week so we can understand your current process and recommend the best next step?\n\nBest,\nAlex", createdAt });
  [
    ["act_demo_1", "lead.created", "Sarah Chen awaiting approval", "Gmail", "pending"],
    ["act_demo_2", "approval.approved", "Follow-up sent to Raj Patel", "Gmail", "success"],
    ["act_demo_3", "integration.connected", "HubSpot CRM synced successfully", "HubSpot", "success"],
    ["act_demo_4", "approval.approved", "Follow-up sent to Mia Torres", "Website form", "success"],
    ["act_demo_5", "workflow.updated", "Lead Follow-up automation active", "automation", "success"]
  ].forEach(([activityId, type, label, source, status], index) => {
    store.activity.push({ id: activityId, userId, type, label, source, status, createdAt: new Date(Date.now() - index * 18 * 60 * 1000).toISOString() });
  });
  await writeStore(store);
  return user;
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
    if (!PUBLIC_SANDBOX_ENABLED) return send(res, 404, { error: "public sandbox is disabled" });
    const user = await seedDemoWorkspace(store);
    return send(res, 200, { user: publicUser(user), token: signToken({ sub: user.id }), demo: true });
  }

  if (req.method === "POST" && url.pathname === "/api/sandbox/start") {
    if (!PUBLIC_SANDBOX_ENABLED) return send(res, 404, { error: "public sandbox is disabled" });
    const user = await seedDemoWorkspace(store);
    return send(res, 200, { user: publicUser(user), token: signToken({ sub: user.id }), sandbox: true });
  }

  const leadWebhookMatch = url.pathname.match(/^\/api\/webhooks\/lead\/([^/]+)$/);
  if (req.method === "POST" && leadWebhookMatch) {
    if (!process.env.LEAD_WEBHOOK_SECRET || req.headers["x-flowpilot-webhook-secret"] !== process.env.LEAD_WEBHOOK_SECRET) {
      return send(res, 401, { error: "invalid lead webhook secret" });
    }
    const user = store.users.find((item) => item.id === leadWebhookMatch[1]);
    if (!user) return send(res, 404, { error: "webhook owner not found" });
    return send(res, 201, await createLeadApproval(store, user, await parseBody(req)));
  }

  if (req.method === "GET" && url.pathname === "/api/webhooks/whatsapp") {
    if (url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN) {
      return send(res, 200, url.searchParams.get("hub.challenge") || "");
    }
    return send(res, 403, { error: "invalid WhatsApp verification token" });
  }

  if (req.method === "POST" && url.pathname === "/api/webhooks/whatsapp") {
    const raw = await readRawBody(req);
    if (!signaturesMatch(raw, req.headers["x-hub-signature-256"], process.env.WHATSAPP_APP_SECRET)) {
      return send(res, 401, { error: "invalid WhatsApp webhook signature" });
    }
    const user = store.users.find((item) => item.id === process.env.WHATSAPP_OWNER_USER_ID);
    if (!user) return send(res, 503, { error: "WhatsApp workspace owner is not configured" });
    const body = parseJson(raw);
    const messages = (body.entry || []).flatMap((entry) => (entry.changes || []).flatMap((change) => change.value?.messages || []));
    for (const message of messages) {
      await createLeadApproval(store, user, { name: message.from || "WhatsApp lead", phone: message.from || null, message: message.text?.body || "", source: "WhatsApp" });
    }
    return send(res, 200, { ok: true, messagesProcessed: messages.length });
  }

  if (req.method === "POST" && url.pathname === "/api/webhooks/razorpay") {
    const raw = await readRawBody(req);
    if (!signaturesMatch(raw, req.headers["x-razorpay-signature"], process.env.RAZORPAY_WEBHOOK_SECRET)) {
      return send(res, 401, { error: "invalid Razorpay webhook signature" });
    }
    const eventId = String(req.headers["x-razorpay-event-id"] || "");
    if (eventId && store.processedWebhookEvents.includes(eventId)) return send(res, 200, { ok: true, duplicate: true });
    const body = parseJson(raw);
    const subscription = body.payload?.subscription?.entity;
    const userId = subscription?.notes?.flowpilot_user_id;
    const user = store.users.find((item) => item.id === userId);
    if (user && subscription) {
      user.plan = subscription.status === "active" ? "pro" : user.plan;
      user.billing = { provider: "razorpay", subscriptionId: subscription.id, status: subscription.status, updatedAt: now() };
      logActivity(store, { userId: user.id, type: `billing.${subscription.status}`, label: `Razorpay subscription ${subscription.status}`, source: "razorpay" });
    }
    if (eventId) store.processedWebhookEvents.push(eventId);
    await writeStore(store);
    return send(res, 200, { ok: true });
  }

  if (req.method === "GET" && url.pathname === "/api/auth/google") {
    const config = integrationConfig("gmail");
    if (!config.clientId || !config.clientSecret) return send(res, 503, { error: "Google login is not configured on this server" });
    const state = signToken({ sub: "google_login", provider: "google_login" });
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: `${API_PUBLIC_URL}/api/auth/google/callback`,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.readonly",
      ].join(" "),
      state,
    });
    return redirect(res, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  }

  if (req.method === "GET" && url.pathname === "/api/auth/google/callback") {
    const stateToken = verifyToken(url.searchParams.get("state"));
    if (!stateToken || stateToken.provider !== "google_login") return redirect(res, `${APP_ORIGIN}/?google_error=invalid_state`);
    const code = url.searchParams.get("code");
    if (!code) return redirect(res, `${APP_ORIGIN}/?google_error=missing_code`);
    try {
      const config = integrationConfig("gmail");
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: `${API_PUBLIC_URL}/api/auth/google/callback`, grant_type: "authorization_code" }),
        signal: AbortSignal.timeout(12000),
      });
      const tokens = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(tokens.error_description || tokens.error || "Google token exchange failed");

      const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
        signal: AbortSignal.timeout(8000),
      });
      const profile = await profileRes.json();
      if (!profileRes.ok || !profile.email) throw new Error("Could not fetch Google profile");

      const googleTokens = { ...tokens, obtainedAt: Date.now() };
      let user = store.users.find((u) => u.email === profile.email.toLowerCase());
      const isNewUser = !user;
      if (!user) {
        user = {
          id: id("usr"),
          name: profile.name || profile.email,
          email: profile.email.toLowerCase(),
          passwordHash: null,
          emailVerified: true,
          googleId: profile.id,
          plan: "free",
          createdAt: now(),
        };
        store.users.push(user);
        logActivity(store, { userId: user.id, type: "user.created", label: "Account created via Google", source: "google_oauth" });
      } else {
        user.googleId = profile.id;
        user.emailVerified = true;
        if (!user.name && profile.name) user.name = profile.name;
      }

      upsertIntegration(store, user.id, "gmail", {
        status: "connected",
        encryptedCredentials: encryptSecret(googleTokens),
        connectedEmail: profile.email.toLowerCase(),
      });
      logActivity(store, { userId: user.id, type: "integration.connected", label: `Gmail connected via Google login`, source: "google_oauth" });

      await writeStore(store);
      const flowpilotToken = signToken({ sub: user.id });
      return redirect(res, `${APP_ORIGIN}/?google_token=${flowpilotToken}&new_user=${isNewUser}`);
    } catch (error) {
      console.error("Google OAuth callback:", error.message);
      return redirect(res, `${APP_ORIGIN}/?google_error=${encodeURIComponent(error.message)}`);
    }
  }


  const oauthCallbackMatch = url.pathname.match(/^\/api\/oauth\/(gmail|hubspot)\/callback$/);
  if (req.method === "GET" && oauthCallbackMatch) {
    const provider = oauthCallbackMatch[1];
    const state = verifyToken(url.searchParams.get("state"));
    if (!state || state.provider !== provider) return send(res, 401, { error: "invalid OAuth state" });
    try {
      const tokens = await exchangeOauthCode(provider, url.searchParams.get("code"));
      upsertIntegration(store, state.sub, provider, { status: "connected", encryptedCredentials: encryptSecret(tokens) });
      logActivity(store, { userId: state.sub, type: "integration.connected", label: `${provider} connected`, source: "oauth" });
      await writeStore(store);
      return redirect(res, `${APP_ORIGIN}/?integration=${provider}_connected`);
    } catch (error) {
      console.error(`${provider} OAuth callback:`, error.message);
      return redirect(res, `${APP_ORIGIN}/?integration=${provider}_failed`);
    }
  }

  if (req.method === "POST" && url.pathname === "/api/auth/request-email-verification") {
    const body = await parseBody(req);
    const user = store.users.find((item) => item.email === String(body.email || "").toLowerCase());
    if (!user) return send(res, 200, { message: "If the account exists, a verification email has been queued." });
    const token = issueAccountToken(store, user, "verify_email", 60 * 24);
    const email = queueAccountEmail(store, user, "verify_email", token);
    await deliverAccountEmail(email);
    await writeStore(store);
    return send(res, 200, { message: "If the account exists, a verification email has been queued.", ...developmentToken(token) });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/verify-email") {
    const body = await parseBody(req);
    const user = consumeAccountToken(store, body.token, "verify_email");
    if (!user) return send(res, 400, { error: "verification token is invalid or expired" });
    user.emailVerified = true;
    user.emailVerifiedAt = now();
    await writeStore(store);
    return send(res, 200, { message: "Email verified successfully." });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/request-password-reset") {
    const body = await parseBody(req);
    const user = store.users.find((item) => item.email === String(body.email || "").toLowerCase());
    if (!user) return send(res, 200, { message: "If the account exists, a password reset email has been queued." });
    const token = issueAccountToken(store, user, "reset_password", 30);
    const email = queueAccountEmail(store, user, "reset_password", token);
    await deliverAccountEmail(email);
    await writeStore(store);
    return send(res, 200, { message: "If the account exists, a password reset email has been queued.", ...developmentToken(token) });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/reset-password") {
    const body = await parseBody(req);
    if (String(body.password || "").length < 8) return send(res, 400, { error: "password must be at least 8 characters" });
    const user = consumeAccountToken(store, body.token, "reset_password");
    if (!user) return send(res, 400, { error: "password reset token is invalid or expired" });
    user.passwordHash = hashPassword(body.password);
    user.passwordChangedAt = now();
    await writeStore(store);
    return send(res, 200, { message: "Password reset successfully." });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/signup") {
  const body = await parseBody(req);

  if (!body.email || !body.password || !body.name) {
    return send(res, 400, {
      error: "name, email, and password are required"
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return send(res, 400, {
      error: "enter a valid email address"
    });
  }

  if (String(body.password).length < 8) {
    return send(res, 400, {
      error: "password must be at least 8 characters"
    });
  }

  if (
    store.users.some(
      (user) =>
        user.email.toLowerCase() ===
        body.email.toLowerCase()
    )
  ) {
    return send(res, 409, {
      error: "email already exists"
    });
  }

  const user = {
    id: id("usr"),
    name: body.name,
    email: body.email.toLowerCase(),
    passwordHash: hashPassword(body.password),
    emailVerified: false,
    plan: "free",
    createdAt: now()
  };

  store.users.push(user);

  logActivity(store, {
    userId: user.id,
    type: "user.created",
    label: "Account created",
    source: "auth"
  });

  const verificationToken = issueAccountToken(
    store,
    user,
    "verify_email",
    60 * 24
  );

  const email = queueAccountEmail(
    store,
    user,
    "verify_email",
    verificationToken
  );

  try {
    await deliverAccountEmail(email);
  } catch (error) {
    console.warn(
      "Email delivery skipped:",
      error.message
    );
  }

  await writeStore(store);

  return send(res, 201, {
    user: publicUser(user),
    token: signToken({ sub: user.id }),
    ...developmentToken(verificationToken)
  });
}

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await parseBody(req);
    const user = store.users.find((candidate) => candidate.email === String(body.email || "").toLowerCase());
    if (!user || !verifyPassword(body.password || "", user.passwordHash)) return send(res, 401, { error: "invalid credentials" });
    return send(res, 200, { user: publicUser(user), token: signToken({ sub: user.id }) });
  }

  if (req.method === "GET" && url.pathname === "/api/templates") {
    const q = String(url.searchParams.get("q") || "").toLowerCase();
    const templates = store.templates.filter((template) => !q || template.title.toLowerCase().includes(q) || template.description.toLowerCase().includes(q));
    return send(res, 200, { templates });
  }

  const user = getAuthUser(req, store);
  if (!enforceAuthGuards(req, res, user, url)) return;

  if (req.method === "GET" && url.pathname === "/api/me") return send(res, 200, { user: publicUser(user), business: getUserBusiness(store, user.id) });

  if (req.method === "POST" && url.pathname === "/api/demo/reset") {
    if (user.id !== "usr_demo_founder") return send(res, 403, { error: "demo reset is only available in the demo workspace" });
    const demoUser = await seedDemoWorkspace(store);
    return send(res, 200, { user: publicUser(demoUser), token: signToken({ sub: demoUser.id }), demo: true });
  }

  if (req.method === "POST" && url.pathname === "/api/sandbox/reset") {
    if (user.id !== "usr_demo_founder") return send(res, 403, { error: "sandbox reset is only available in the sandbox workspace" });
    const sandboxUser = await seedDemoWorkspace(store);
    return send(res, 200, { user: publicUser(sandboxUser), token: signToken({ sub: sandboxUser.id }), sandbox: true });
  }

  if (req.method === "POST" && url.pathname === "/api/onboarding/business") {
    const body = await parseBody(req);
    let business = getUserBusiness(store, user.id);
    if (!business) {
      business = { id: id("biz"), userId: user.id, createdAt: now() };
      store.businesses.push(business);
    }
    Object.assign(business, {
      name: body.name || business.name || "Untitled Business",
      type: body.type || business.type || "other",
      tone: body.tone || business.tone || "professional",
      goals: Array.isArray(body.goals) ? body.goals : business.goals || ["lead_follow_up"],
      updatedAt: now()
    });
    logActivity(store, { userId: user.id, type: "business.updated", label: "Business profile updated", source: "onboarding" });
    await writeStore(store);
    return send(res, 200, { business });
  }

  if (req.method === "GET" && url.pathname === "/api/dashboard") return send(res, 200, dashboardFor(store, user));

  if (req.method === "GET" && url.pathname === "/api/workflows") {
    return send(res, 200, { workflows: userRows(store, "workflows", user.id) });
  }

  if (req.method === "GET" && url.pathname === "/api/leads") {
    return send(res, 200, { leads: userRows(store, "leads", user.id) });
  }

  if (req.method === "GET" && url.pathname === "/api/approvals") {
    const approvals = userRows(store, "approvals", user.id).map((approval) => ({
      ...approval,
      lead: store.leads.find((lead) => lead.id === approval.leadId) || null
    }));
    return send(res, 200, { approvals });
  }

  if (req.method === "GET" && url.pathname === "/api/integrations") {
    return send(res, 200, { integrations: userRows(store, "integrations", user.id) });
  }

  if (req.method === "POST" && url.pathname === "/api/workflows/from-template") {
    const body = await parseBody(req);
    const template = store.templates.find((item) => item.id === body.templateId);
    if (!template) return send(res, 404, { error: "template not found" });
    if (store.workflows.some((item) => item.userId === user.id && item.templateId === template.id)) return send(res, 409, { error: "workflow template is already active" });
    const workflow = {
      id: id("wf"),
      userId: user.id,
      templateId: template.id,
      name: body.name || template.title,
      status: "active",
      trigger: template.trigger,
      actions: template.actions,
      runs: 0,
      createdAt: now(),
      updatedAt: now()
    };
    store.workflows.push(workflow);
    logActivity(store, { userId: user.id, type: "workflow.created", label: `${workflow.name} activated`, source: "templates" });
    await writeStore(store);
    return send(res, 201, { workflow });
  }

  const workflowMatch = url.pathname.match(/^\/api\/workflows\/([^/]+)$/);
  if (req.method === "PATCH" && workflowMatch) {
    const body = await parseBody(req);
    const workflow = store.workflows.find((item) => item.id === workflowMatch[1] && item.userId === user.id);
    if (!workflow) return send(res, 404, { error: "workflow not found" });
    if (["active", "paused"].includes(body.status)) workflow.status = body.status;
    workflow.updatedAt = now();
    logActivity(store, { userId: user.id, type: "workflow.updated", label: `${workflow.name} ${workflow.status}`, source: "dashboard" });
    await writeStore(store);
    return send(res, 200, { workflow });
  }

  if (req.method === "POST" && url.pathname === "/api/leads") {
    return send(res, 201, await createLeadApproval(store, user, await parseBody(req)));
  }

  if (req.method === "GET" && url.pathname === "/api/activity") {
    return send(res, 200, { activity: store.activity.filter((item) => item.userId === user.id) });
  }

  const approvalMatch = url.pathname.match(/^\/api\/approvals\/([^/]+)\/(approve|reject)$/);
  if (req.method === "POST" && approvalMatch) {
    const approval = store.approvals.find((item) => item.id === approvalMatch[1] && item.userId === user.id);
    if (!approval) return send(res, 404, { error: "approval not found" });
    const body = await parseBody(req);
    if (typeof body.draft === "string" && body.draft.trim()) approval.draft = body.draft.trim();
    approval.status = approvalMatch[2] === "approve" ? "approved" : "rejected";
    approval.resolvedAt = now();
    const lead = store.leads.find((item) => item.id === approval.leadId);
    if (lead) lead.status = approval.status === "approved" ? "follow_up_sent" : "needs_review";
    if (approval.status === "approved") {
      const delivery = await sendGmailFollowUp(store, user, lead, approval.draft);
      approval.deliveryProvider = delivery.provider;
      const workflow = store.workflows.find((item) => item.userId === user.id && item.status === "active");
      if (workflow) workflow.runs += 1;
    }
    logActivity(store, { userId: user.id, type: `approval.${approval.status}`, label: `Draft ${approval.status}`, source: "approvals" });
    await writeStore(store);
    return send(res, 200, { approval });
  }

  const integrationMatch = url.pathname.match(/^\/api\/integrations\/([^/]+)\/connect$/);
  if (req.method === "POST" && integrationMatch) {
    const provider = integrationMatch[1];
    const authorizationUrl = oauthAuthorizationUrl(provider, user.id);
    if (authorizationUrl) return send(res, 200, { provider, authorizationUrl, mode: "oauth" });
    const integration = upsertIntegration(store, user.id, provider, { status: "connected" });
    logActivity(store, { userId: user.id, type: "integration.connected", label: `${provider} connected`, source: "integrations" });
    await writeStore(store);
    return send(res, 200, { integration, mode: "demo" });
  }

  if (req.method === "POST" && url.pathname === "/api/integrations/gmail/sync") {
    try {
      const createdLeads = await syncGmailInbox(store, user);
      if (createdLeads.length) {
        logActivity(store, { userId: user.id, type: "integration.synced", label: `${createdLeads.length} new lead${createdLeads.length === 1 ? "" : "s"} found in Gmail inbox`, source: "gmail" });
        await writeStore(store);
      }
      return send(res, 200, { created: createdLeads.length, leads: createdLeads });
    } catch (error) {
      console.error("Gmail inbox sync:", error.message);
      return send(res, error.status || 502, { error: error.message || "Gmail inbox sync failed" });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/ai/draft-follow-up") {
    const body = await parseBody(req);
    const business = getUserBusiness(store, user.id);
    return send(res, 200, await draftFollowUp({ ...body, businessName: business?.name, tone: business?.tone }));
  }

  if (req.method === "POST" && url.pathname === "/api/billing/subscription") {
    if (BILLING_DISABLED) return send(res, 404, { error: "billing is disabled for this deployment" });
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET || !process.env.RAZORPAY_PLAN_ID) {
      return send(res, 503, { error: "Razorpay subscription keys and plan ID are not configured" });
    }
    const credentials = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
      body: JSON.stringify({ plan_id: process.env.RAZORPAY_PLAN_ID, total_count: 12, quantity: 1, customer_notify: true, notes: { flowpilot_user_id: user.id } }),
      signal: AbortSignal.timeout(12000)
    });
    const subscription = await response.json();
    if (!response.ok) return send(res, response.status, { error: subscription.error?.description || "Could not create Razorpay subscription" });
    user.billing = { provider: "razorpay", subscriptionId: subscription.id, status: subscription.status, updatedAt: now() };
    await writeStore(store);
    return send(res, 201, { keyId: process.env.RAZORPAY_KEY_ID, subscription });
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
