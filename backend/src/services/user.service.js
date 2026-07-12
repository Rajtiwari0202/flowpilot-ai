const { GROQ_MODEL, PUBLIC_SANDBOX_ENABLED, BILLING_DISABLED } = require("../config/env");
const { id, now } = require("../utils/helpers");

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function getUserBusiness(store, userId) {
  return store.businesses.find((business) => business.userId === userId) || null;
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

async function createLeadApproval(store, user, body, { writeStore, syncHubspotLead }) {
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
  return store[collection].filter((item) => item.userId === userId);
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
