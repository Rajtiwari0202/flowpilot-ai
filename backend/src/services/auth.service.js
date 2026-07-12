const crypto = require("crypto");
const { APP_ORIGIN } = require("../config/env");
const { hashPassword, tokenHash } = require("../utils/crypto");
const { id, now } = require("../utils/helpers");
const { structuredLog } = require("../utils/logger");

function issueAccountToken(store, user, kind, ttlMinutes) {
  const token = crypto.randomBytes(32).toString("hex");
  store.authTokens = (store.authTokens || []).filter((item) => !(item.userId === user.id && item.kind === kind && !item.usedAt));
  store.authTokens.push({
    id: id("tok"),
    userId: user.id,
    kind,
    tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString(),
    createdAt: now()
  });
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

async function seedDemoWorkspace(store, { writeStore }) {
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

module.exports = {
  issueAccountToken,
  consumeAccountToken,
  queueAccountEmail,
  deliverAccountEmail,
  developmentToken,
  seedDemoWorkspace,
};
