const crypto = require("crypto");
const { APP_ORIGIN } = require("../config/env");
const { hashPassword, tokenHash } = require("../utils/crypto");
const { id, now } = require("../utils/helpers");
const { structuredLog } = require("../utils/logger");

async function issueAccountToken(user, kind, ttlMinutes) {
  const { repository } = require("../app");
  const token = crypto.randomBytes(32).toString("hex");
  const th = tokenHash(token);
  const tokenId = id("tok");
  
  await repository.authTokens.create({
    id: tokenId,
    userId: user.id,
    kind,
    tokenHash: th,
    expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString(),
    createdAt: now()
  });
  return token;
}

async function consumeAccountToken(token, kind) {
  const { repository } = require("../app");
  const th = tokenHash(String(token || ""));
  const row = await repository.authTokens.getByKindAndHash(kind, th);
  if (!row || row.usedAt || new Date(row.expiresAt).getTime() < Date.now()) return null;
  
  await repository.authTokens.update(row.id, { usedAt: now() });
  return repository.users.getById(row.userId);
}

async function queueAccountEmail(user, kind, token) {
  const { repository } = require("../app");
  const path = kind === "verify_email" ? "verify-email" : "reset-password";
  const mailId = id("mail");
  const row = {
    id: mailId,
    userId: user.id,
    toEmail: user.email,
    to: user.email,
    kind,
    status: "queued",
    link: `${APP_ORIGIN}/?${path}=${token}`,
    createdAt: now()
  };
  await repository.outbox.create(row);
  structuredLog("info", "email.queued", { kind, userId: user.id });
  return row;
}

async function deliverAccountEmail(row) {
  let subject = "Notification from ACE";
  if (row.kind === "verify_email") {
    subject = "Verify your ACE email";
  } else if (row.kind === "reset_password") {
    subject = "Reset your ACE password";
  } else if (row.kind === "approval_reminder") {
    subject = "Pending Approvals Reminder";
  }

  const emailTo = row.to || row.toEmail;
  if (!emailTo) return;

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    // If not configured, simulation is successful
    row.status = "sent";
    row.sentAt = now();
    const { repository } = require("../app");
    await repository.outbox.update(row.id, { status: "sent", sentAt: row.sentAt });
    return;
  }

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
      to: [emailTo],
      subject,
      text: `Open this link to continue: ${row.link}`
    }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Resend email failed: ${response.status}`);
  
  row.status = "sent";
  row.sentAt = now();
  const { repository } = require("../app");
  await repository.outbox.update(row.id, { status: "sent", sentAt: row.sentAt });
}

function developmentToken(token) {
  return process.env.NODE_ENV === "production" ? {} : { developmentToken: token };
}

async function seedDemoWorkspace(store, { writeStore } = {}) {
  // Return the granular DB implementation
  const { repository } = require("../app");
  const userId = "usr_demo_founder";
  const createdAt = now();

  await repository.users.delete(userId);

  const user = { id: userId, name: "Alex Johnson", email: "alex@novacreative.demo", passwordHash: hashPassword("flowpilot-demo"), emailVerified: true, plan: "free", createdAt };
  await repository.users.create(user);
  
  await repository.businesses.create({ id: "biz_demo_agency", userId, name: "Nova Creative Studio", type: "agency", tone: "friendly", goals: ["lead_follow_up"], createdAt, updatedAt: createdAt });
  
  await repository.integrations.create({ id: "int_demo_gmail", userId, provider: "gmail", status: "connected", createdAt, updatedAt: createdAt });
  await repository.integrations.create({ id: "int_demo_hubspot", userId, provider: "hubspot", status: "connected", createdAt, updatedAt: createdAt });
  
  await repository.workflows.create({ id: "wf_demo_follow_up", userId, templateId: "tpl_lead_follow_up", name: "Lead Follow-up", status: "active", triggerKey: "lead.created", actions: ["classify_lead", "draft_reply", "request_approval", "send_email"], runs: 1245, createdAt, updatedAt: createdAt });
  await repository.workflows.create({ id: "wf_demo_crm", userId, templateId: "tpl_crm_auto_update", name: "CRM Auto-Update", status: "active", triggerKey: "lead.updated", actions: ["normalize_contact", "update_crm", "log_activity"], runs: 836, createdAt, updatedAt: createdAt });
  
  await repository.leads.create({ id: "lead_demo_sarah", userId, name: "Sarah Chen", email: "sarah@northstar.co", phone: "+91 98765 43210", message: "We need a lead follow-up system for our consulting team.", source: "Gmail", status: "pending_approval", createdAt });
  await repository.leads.create({ id: "lead_demo_mia", userId, name: "Mia Torres", email: "mia@brightpath.io", phone: null, message: "Interested in your design retainer plans.", source: "Website form", status: "follow_up_sent", createdAt });
  await repository.leads.create({ id: "lead_demo_raj", userId, name: "Raj Patel", email: "raj@scalehouse.in", phone: "+91 99887 77665", message: "Can your team help us redesign our SaaS onboarding?", source: "Gmail", status: "follow_up_sent", createdAt });
  await repository.leads.create({ id: "lead_demo_priya", userId, name: "Priya Sharma", email: "priya@launchbox.in", phone: null, message: "Looking for a brand refresh before our next launch.", source: "Website form", status: "follow_up_sent", createdAt });
  
  await repository.approvals.create({ id: "appr_demo_sarah", userId, leadId: "lead_demo_sarah", status: "pending", kind: "follow_up_draft", draft: "Hi Sarah,\n\nThanks so much for reaching out. I saw your note about setting up a lead follow-up system for your consulting team. Nova Creative Studio can help map the workflow and create a polished customer experience around it.\n\nWould you be open to a quick 20-minute call this week so we can understand your current process and recommend the best next step?\n\nBest,\nAlex", createdAt });
  
  const activities = [
    ["act_demo_1", "lead.created", "Sarah Chen awaiting approval", "Gmail", "pending"],
    ["act_demo_2", "approval.approved", "Follow-up sent to Raj Patel", "Gmail", "success"],
    ["act_demo_3", "integration.connected", "HubSpot CRM synced successfully", "HubSpot", "success"],
    ["act_demo_4", "approval.approved", "Follow-up sent to Mia Torres", "Website form", "success"],
    ["act_demo_5", "workflow.updated", "Lead Follow-up automation active", "automation", "success"]
  ];
  for (let index = 0; index < activities.length; index++) {
    const [activityId, type, label, source, status] = activities[index];
    await repository.activity.create({ id: activityId, userId, type, label, source, status, createdAt: new Date(Date.now() - index * 18 * 60 * 1000).toISOString() });
  }
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
