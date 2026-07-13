const { GROQ_MODEL, PUBLIC_SANDBOX_ENABLED, BILLING_DISABLED } = require("../config/env");
const { id, now } = require("../utils/helpers");

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function getUserBusiness(store, userId) {
  // Keeping signature for backward compatibility, but we can query repository directly
  const { repository } = require("../app");
  return repository.businesses.getByUserId(userId);
}

function logActivity(store, item) {
  // Keeping signature for backward compatibility, but we can query repository directly
  const { repository } = require("../app");
  return repository.activity.create(item);
}

async function dashboardFor(user) {
  const { repository } = require("../app");
  const business = await repository.businesses.getByUserId(user.id);
  const workflows = await repository.workflows.listByUserId(user.id);
  const leads = await repository.leads.listByUserId(user.id);
  const activityList = await repository.activity.listByUserId(user.id);
  const activity = activityList.slice(0, 10);
  const approvals = await repository.approvals.listByUserId(user.id);
  const pendingApprovals = approvals.filter((approval) => approval.status === "pending");
  const errors = activityList.filter((item) => item.status === "error");
  
  return {
    user: publicUser(user),
    business,
    metrics: {
      activeAutomations: workflows.filter((workflow) => workflow.status === "active").length,
      leadsProcessedToday: leads.length,
      pendingApprovals: pendingApprovals.length,
      errors: errors.length,
      timeSavedMinutesThisWeek: leads.length * 12,
      successRate: activityList.length ? Math.round((activityList.length - errors.length) / activityList.length * 100) : 100
    },
    workflows,
    activity,
    approvals: pendingApprovals
  };
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

async function createLeadApproval(user, body) {
  const { repository } = require("../app");
  const { syncHubspotLead } = require("./oauth.service");

  const lead = {
    id: id("lead"),
    userId: user.id,
    name: body.name || "New lead",
    email: body.email || null,
    phone: body.phone || null,
    message: body.message || "",
    source: body.source || "manual",
    status: "new",
    gmailMessageId: body.gmailMessageId || null,
    createdAt: now()
  };
  try {
    await repository.leads.create(lead);
  } catch (err) {
    if (err.code === "23505" || err.message.includes("unique") || err.message.includes("duplicate")) {
      const existing = await repository.leads.getByGmailMessageId(user.id, lead.gmailMessageId);
      if (existing) {
        const approval = await repository.approvals.getByLeadId(existing.id);
        return { lead: existing, approval };
      }
    }
    throw err;
  }

  const business = await repository.businesses.getByUserId(user.id);
  const generated = await draftFollowUp({ leadName: lead.name, businessName: business?.name, tone: business?.tone, message: lead.message });
  
  const approval = {
    id: id("appr"),
    userId: user.id,
    leadId: lead.id,
    status: "pending",
    kind: "follow_up_draft",
    draft: generated.draft,
    aiProvider: generated.provider,
    createdAt: now(),
    resolvedAt: null
  };
  await repository.approvals.create(approval);

  await repository.activity.create({
    userId: user.id,
    type: "lead.created",
    label: `${lead.name} awaiting approval`,
    source: lead.source,
    status: "pending"
  });

  try {
    const sync = await syncHubspotLead(null, user, lead);
    if (sync.provider === "hubspot") {
      await repository.activity.create({
        userId: user.id,
        type: "integration.synced",
        label: `${lead.name} synced to HubSpot`,
        source: "hubspot",
        status: "success"
      });
    }
  } catch (error) {
    console.error("HubSpot sync:", error.message);
    await repository.activity.create({
      userId: user.id,
      type: "integration.error",
      label: `${lead.name} could not sync to HubSpot`,
      source: "hubspot",
      status: "error"
    });
  }

  return { lead, approval };
}

function systemStatus() {
  return {
    mode: process.env.NODE_ENV === "production" ? "production" : "development",
    services: {
      publicSandbox: { enabled: PUBLIC_SANDBOX_ENABLED },
      ai: { provider: process.env.GROQ_API_KEY ? "groq" : "local", configured: Boolean(process.env.GROQ_API_KEY) },
      billing: {
        provider: "razorpay",
        configured: !BILLING_DISABLED && Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_PLAN_ID),
        disabled: BILLING_DISABLED
      },
      database: { provider: process.env.DATABASE_URL ? "supabase_postgres" : "local_json", configured: Boolean(process.env.DATABASE_URL) },
      leadWebhook: { configured: Boolean(process.env.LEAD_WEBHOOK_SECRET) },
      gmail: { configured: Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET) },
      hubspot: { configured: Boolean(process.env.HUBSPOT_CLIENT_ID && process.env.HUBSPOT_CLIENT_SECRET) },
      whatsapp: { configured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_VERIFY_TOKEN && process.env.WHATSAPP_APP_SECRET && process.env.WHATSAPP_OWNER_USER_ID) },
      accountEmail: { provider: process.env.RESEND_API_KEY ? "resend" : "local_outbox", configured: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) }
    }
  };
}

function userRows(store, collection, userId) {
  // Keeping signature for backward compatibility, but we can query repository directly
  return [];
}

module.exports = {
  publicUser,
  getUserBusiness,
  logActivity,
  dashboardFor,
  fallbackDraftFollowUp,
  draftFollowUp,
  createLeadApproval,
  systemStatus,
  userRows,
};
