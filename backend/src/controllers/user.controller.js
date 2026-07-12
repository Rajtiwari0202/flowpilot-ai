const {
  publicUser,
  getUserBusiness,
  logActivity,
  dashboardFor,
  draftFollowUp,
  createLeadApproval,
  systemStatus,
  userRows,
} = require("../services/user.service");
const {
  oauthAuthorizationUrl,
  upsertIntegration,
  verifyOauthState,
  exchangeOauthCode,
  syncHubspotLead,
} = require("../services/oauth.service");
const { send, redirect, parseBody, id, now, parseJson } = require("../utils/helpers");
const { decryptSecret, encryptSecret, signaturesMatch } = require("../utils/crypto");

async function getMe(req, res, store, user) {
  return send(res, 200, { user: publicUser(user), business: getUserBusiness(store, user.id) });
}

async function updateBusiness(req, res, store, user, { writeStore }) {
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

async function getDashboard(req, res, store, user) {
  return send(res, 200, dashboardFor(store, user));
}

async function getWorkflows(req, res, store, user) {
  return send(res, 200, { workflows: userRows(store, "workflows", user.id) });
}

async function getLeads(req, res, store, user) {
  return send(res, 200, { leads: userRows(store, "leads", user.id) });
}

async function getApprovals(req, res, store, user) {
  const approvals = userRows(store, "approvals", user.id).map((approval) => ({
    ...approval,
    lead: store.leads.find((lead) => lead.id === approval.leadId) || null
  }));
  return send(res, 200, { approvals });
}

async function getIntegrations(req, res, store, user) {
  return send(res, 200, { integrations: userRows(store, "integrations", user.id) });
}

async function createWorkflowFromTemplate(req, res, store, user, { writeStore }) {
  const body = await parseBody(req);
  const template = store.templates.find((item) => item.id === body.templateId);
  if (!template) return send(res, 404, { error: "template not found" });
  if (store.workflows.some((item) => item.userId === user.id && item.templateId === template.id)) {
    return send(res, 409, { error: "workflow template is already active" });
  }
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

async function updateWorkflowStatus(req, res, store, user, workflowId, { writeStore }) {
  const body = await parseBody(req);
  const workflow = store.workflows.find((item) => item.id === workflowId && item.userId === user.id);
  if (!workflow) return send(res, 404, { error: "workflow not found" });
  if (["active", "paused"].includes(body.status)) workflow.status = body.status;
  workflow.updatedAt = now();
  logActivity(store, { userId: user.id, type: "workflow.updated", label: `${workflow.name} ${workflow.status}`, source: "dashboard" });
  await writeStore(store);
  return send(res, 200, { workflow });
}

async function createLead(req, res, store, user, { writeStore }) {
  const body = await parseBody(req);
  return send(res, 201, await createLeadApproval(store, user, body, { writeStore, syncHubspotLead }));
}

async function getActivity(req, res, store, user) {
  return send(res, 200, { activity: store.activity.filter((item) => item.userId === user.id) });
}

async function resolveApproval(req, res, store, user, approvalId, action, { writeStore, sendGmailFollowUp }) {
  const approval = store.approvals.find((item) => item.id === approvalId && item.userId === user.id);
  if (!approval) return send(res, 404, { error: "approval not found" });
  const body = await parseBody(req);
  if (typeof body.draft === "string" && body.draft.trim()) approval.draft = body.draft.trim();
  approval.status = action === "approve" ? "approved" : "rejected";
  approval.resolvedAt = now();
  const lead = store.leads.find((item) => item.id === approval.leadId);
  if (lead) lead.status = approval.status === "approved" ? "follow_up_sent" : "needs_review";
  if (approval.status === "approved") {
    const delivery = await sendGmailFollowUp(store, user, lead, approval.draft, { getUserBusiness });
    approval.deliveryProvider = delivery.provider;
    const workflow = store.workflows.find((item) => item.userId === user.id && item.status === "active");
    if (workflow) workflow.runs += 1;
  }
  logActivity(store, { userId: user.id, type: `approval.${approval.status}`, label: `Draft ${approval.status}`, source: "approvals" });
  await writeStore(store);
  return send(res, 200, { approval });
}

async function connectIntegration(req, res, store, user, provider, { writeStore }) {
  const authorizationUrl = oauthAuthorizationUrl(provider, user.id);
  if (authorizationUrl) return send(res, 200, { provider, authorizationUrl, mode: "oauth" });
  const integration = upsertIntegration(store, user.id, provider, { status: "connected" });
  logActivity(store, { userId: user.id, type: "integration.connected", label: `${provider} connected`, source: "integrations" });
  await writeStore(store);
  return send(res, 200, { integration, mode: "demo" });
}

async function generateAIDraft(req, res, store, user) {
  const body = await parseBody(req);
  const business = getUserBusiness(store, user.id);
  return send(res, 200, await draftFollowUp({ ...body, businessName: business?.name, tone: business?.tone }));
}

async function createBillingSubscription(req, res, store, user, { writeStore, BILLING_DISABLED }) {
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

async function searchTemplates(req, res, store, url) {
  const q = String(url.searchParams.get("q") || "").toLowerCase();
  const templates = store.templates.filter((template) => !q || template.title.toLowerCase().includes(q) || template.description.toLowerCase().includes(q));
  return send(res, 200, { templates });
}

async function leadWebhook(req, res, store, userId, { writeStore }) {
  if (!process.env.LEAD_WEBHOOK_SECRET || req.headers["x-flowpilot-webhook-secret"] !== process.env.LEAD_WEBHOOK_SECRET) {
    return send(res, 401, { error: "invalid lead webhook secret" });
  }
  const user = store.users.find((item) => item.id === userId);
  if (!user) return send(res, 404, { error: "webhook owner not found" });
  return send(res, 201, await createLeadApproval(store, user, await parseBody(req), { writeStore, syncHubspotLead }));
}

async function whatsappVerifyWebhook(req, res, url) {
  if (url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN) {
    return send(res, 200, url.searchParams.get("hub.challenge") || "");
  }
  return send(res, 403, { error: "invalid WhatsApp verification token" });
}

async function whatsappWebhook(req, res, store, { writeStore, readRawBody }) {
  const raw = await readRawBody(req);
  if (!signaturesMatch(raw, req.headers["x-hub-signature-256"], process.env.WHATSAPP_APP_SECRET)) {
    return send(res, 401, { error: "invalid WhatsApp webhook signature" });
  }
  const user = store.users.find((item) => item.id === process.env.WHATSAPP_OWNER_USER_ID);
  if (!user) return send(res, 503, { error: "WhatsApp workspace owner is not configured" });
  const body = parseJson(raw);
  const messages = (body.entry || []).flatMap((entry) => (entry.changes || []).flatMap((change) => change.value?.messages || []));
  for (const message of messages) {
    await createLeadApproval(store, user, { name: message.from || "WhatsApp lead", phone: message.from || null, message: message.text?.body || "", source: "WhatsApp" }, { writeStore, syncHubspotLead });
  }
  return send(res, 200, { ok: true, messagesProcessed: messages.length });
}

async function razorpayWebhook(req, res, store, { writeStore, readRawBody }) {
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

async function integrationCallback(req, res, store, provider, { APP_ORIGIN, writeStore }) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const state = verifyOauthState(url.searchParams.get("state"), provider);
  if (!state) return send(res, 401, { error: "invalid OAuth state" });
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

module.exports = {
  getMe,
  updateBusiness,
  getDashboard,
  getWorkflows,
  getLeads,
  getApprovals,
  getIntegrations,
  createWorkflowFromTemplate,
  updateWorkflowStatus,
  createLead,
  getActivity,
  resolveApproval,
  connectIntegration,
  generateAIDraft,
  createBillingSubscription,
  searchTemplates,
  leadWebhook,
  whatsappVerifyWebhook,
  whatsappWebhook,
  razorpayWebhook,
  integrationCallback,
};
