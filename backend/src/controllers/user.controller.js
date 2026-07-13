const {
  publicUser,
  dashboardFor,
  draftFollowUp,
  createLeadApproval,
  systemStatus,
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
const crypto = require("crypto");
const { enqueueLeadProcessing } = require("../services/queue.service");
const { sendWhatsAppFollowUp } = require("../services/whatsapp.service");

async function getMe(req, res, store, user) {
  const { repository } = require("../app");
  const business = await repository.businesses.getByUserId(user.id);
  return send(res, 200, { user: publicUser(user), business });
}

async function updateBusiness(req, res, store, user) {
  const body = await parseBody(req);
  const { repository } = require("../app");
  let business = await repository.businesses.getByUserId(user.id);
  if (!business) {
    business = { id: id("biz"), userId: user.id, name: body.name || "Untitled Business", type: body.type || "other", tone: body.tone || "professional", goals: Array.isArray(body.goals) ? body.goals : ["lead_follow_up"], createdAt: now(), updatedAt: now() };
    await repository.businesses.create(business);
  } else {
    const updates = {
      name: body.name || business.name || "Untitled Business",
      type: body.type || business.type || "other",
      tone: body.tone || business.tone || "professional",
      goals: Array.isArray(body.goals) ? body.goals : business.goals || ["lead_follow_up"],
      updatedAt: now()
    };
    Object.assign(business, updates);
    await repository.businesses.updateByUserId(user.id, updates);
  }
  await repository.activity.create({ userId: user.id, type: "business.updated", label: "Business profile updated", source: "onboarding", status: "success" });
  return send(res, 200, { business });
}

async function getDashboard(req, res, store, user) {
  return send(res, 200, await dashboardFor(user));
}

async function getWorkflows(req, res, store, user) {
  const { repository } = require("../app");
  const workflows = await repository.workflows.listByUserId(user.id);
  return send(res, 200, { workflows });
}

async function getLeads(req, res, store, user) {
  const { repository } = require("../app");
  const leads = await repository.leads.listByUserId(user.id);
  return send(res, 200, { leads });
}

async function getApprovals(req, res, store, user) {
  const { repository } = require("../app");
  const approvals = await repository.approvals.listByUserId(user.id);
  const leads = await repository.leads.listByUserId(user.id);
  const enriched = approvals.map((approval) => ({
    ...approval,
    lead: leads.find((lead) => lead.id === approval.leadId) || null
  }));
  return send(res, 200, { approvals: enriched });
}

async function getIntegrations(req, res, store, user) {
  const { repository } = require("../app");
  const integrations = await repository.integrations.listByUserId(user.id);
  return send(res, 200, { integrations });
}

async function createWorkflowFromTemplate(req, res, store, user) {
  const body = await parseBody(req);
  const { repository } = require("../app");
  const template = await repository.templates.getById(body.templateId);
  if (!template) return send(res, 404, { error: "template not found" });
  
  const workflows = await repository.workflows.listByUserId(user.id);
  if (workflows.some((item) => item.templateId === template.id)) {
    return send(res, 409, { error: "workflow template is already active" });
  }
  
  const workflow = {
    id: id("wf"),
    userId: user.id,
    templateId: template.id,
    name: body.name || template.title,
    status: "active",
    triggerKey: template.triggerKey,
    actions: template.actions,
    runs: 0,
    createdAt: now(),
    updatedAt: now()
  };
  await repository.workflows.create(workflow);
  await repository.activity.create({ userId: user.id, type: "workflow.created", label: `${workflow.name} activated`, source: "templates", status: "success" });
  return send(res, 201, { workflow });
}

async function updateWorkflowStatus(req, res, store, user, workflowId) {
  const body = await parseBody(req);
  const { repository } = require("../app");
  const workflow = await repository.workflows.getById(workflowId);
  if (!workflow || workflow.userId !== user.id) return send(res, 404, { error: "workflow not found" });
  
  const updates = { updatedAt: now() };
  if (["active", "paused"].includes(body.status)) {
    updates.status = body.status;
    workflow.status = body.status;
  }
  
  await repository.workflows.update(workflowId, updates);
  await repository.activity.create({ userId: user.id, type: "workflow.updated", label: `${workflow.name} ${workflow.status}`, source: "dashboard", status: "success" });
  return send(res, 200, { workflow });
}

async function createLead(req, res, store, user) {
  const body = await parseBody(req);
  const { repository } = require("../app");
  
  const lead = {
    id: `lead_${crypto.randomBytes(8).toString("hex")}`,
    userId: user.id,
    name: body.name,
    email: body.email || null,
    phone: body.phone || null,
    message: body.message || "",
    source: body.source || "manual",
    status: "new",
    createdAt: new Date().toISOString()
  };
  
  await repository.leads.create(lead);
  await enqueueLeadProcessing(user.id, lead.id);

  const approval = await repository.approvals.getByLeadId(lead.id) || {
    id: `appr_mock_${lead.id}`,
    userId: user.id,
    leadId: lead.id,
    status: "pending",
    draft: "AI follow-up draft is compiling in the background..."
  };

  const { captureEvent } = require("../services/observability.service");
  captureEvent(user.id, "lead_created", { source: lead.source });

  return send(res, 201, { lead, approval });
}

async function getActivity(req, res, store, user) {
  const { repository } = require("../app");
  const activity = await repository.activity.listByUserId(user.id);
  return send(res, 200, { activity });
}

async function resolveApproval(req, res, store, user, approvalId, action, { sendGmailFollowUp }) {
  const { repository } = require("../app");
  const approval = await repository.approvals.getById(approvalId);
  if (!approval || approval.userId !== user.id) return send(res, 404, { error: "approval not found" });
  
  const body = await parseBody(req);
  if (typeof body.draft === "string" && body.draft.trim()) {
    approval.draft = body.draft.trim();
  }
  
  approval.status = action === "approve" ? "approved" : "rejected";
  approval.resolvedAt = now();
  
  await repository.approvals.update(approvalId, {
    draft: approval.draft,
    status: approval.status,
    resolvedAt: approval.resolvedAt
  });
  
  const lead = await repository.leads.getById(approval.leadId);
  if (lead) {
    lead.status = approval.status === "approved" ? "follow_up_sent" : "needs_review";
    await repository.leads.update(lead.id, { status: lead.status });
  }
  
  if (approval.status === "approved") {
    let delivery;
    if (approval.deliveryProvider === "whatsapp") {
      delivery = await sendWhatsAppFollowUp(store, user, lead, approval.draft);
    } else {
      delivery = await sendGmailFollowUp(store, user, lead, approval.draft, {
        getUserBusiness: (s, uId) => repository.businesses.getByUserId(uId)
      });
    }
    approval.deliveryProvider = delivery.provider;
    await repository.approvals.update(approvalId, { deliveryProvider: approval.deliveryProvider });
    
    const workflows = await repository.workflows.listByUserId(user.id);
    const activeWorkflow = workflows.find((item) => item.status === "active");
    if (activeWorkflow) {
      await repository.workflows.incrementRuns(activeWorkflow.id);
    }
  }
  
  const { captureEvent } = require("../services/observability.service");
  captureEvent(user.id, "approval_resolved", { action, provider: approval.deliveryProvider });

  await repository.activity.create({
    userId: user.id,
    type: `approval.${approval.status}`,
    label: `Draft ${approval.status}`,
    source: "approvals",
    status: "success"
  });
  
  return send(res, 200, { approval });
}

async function connectIntegration(req, res, store, user, provider) {
  const { repository } = require("../app");
  const authorizationUrl = await oauthAuthorizationUrl(store, user.id, provider, {});
  if (authorizationUrl) return send(res, 200, { provider, authorizationUrl, mode: "oauth" });
  
  const integration = await repository.integrations.upsert(user.id, provider, { status: "connected" });
  await repository.activity.create({
    userId: user.id,
    type: "integration.connected",
    label: `${provider} connected`,
    source: "integrations",
    status: "success"
  });
  return send(res, 200, { integration, mode: "demo" });
}

async function generateAIDraft(req, res, store, user) {
  const body = await parseBody(req);
  const { repository } = require("../app");
  const business = await repository.businesses.getByUserId(user.id);
  return send(res, 200, await draftFollowUp({ ...body, businessName: business?.name, tone: business?.tone }));
}

async function createBillingSubscription(req, res, store, user, { BILLING_DISABLED }) {
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
  
  user.billing = { provider: "razorpay", subscriptionId: subscription.id, status: subscription.status, shortUrl: subscription.short_url || null, updatedAt: now() };
  const { repository } = require("../app");
  await repository.users.update(user.id, { billing: user.billing });
  
  return send(res, 201, { keyId: process.env.RAZORPAY_KEY_ID, subscription });
}

async function searchTemplates(req, res, store, url) {
  const q = String(url.searchParams.get("q") || "").toLowerCase();
  const { repository } = require("../app");
  const templates = await repository.templates.list();
  const filtered = templates.filter((template) => !q || template.title.toLowerCase().includes(q) || template.description.toLowerCase().includes(q));
  return send(res, 200, { templates: filtered });
}

async function leadWebhook(req, res, store, userId) {
  if (!process.env.LEAD_WEBHOOK_SECRET || req.headers["x-flowpilot-webhook-secret"] !== process.env.LEAD_WEBHOOK_SECRET) {
    return send(res, 401, { error: "invalid lead webhook secret" });
  }
  const { repository } = require("../app");
  const user = await repository.users.getById(userId);
  if (!user) return send(res, 404, { error: "webhook owner not found" });
  
  const body = await parseBody(req);
  const lead = {
    id: `lead_${crypto.randomBytes(8).toString("hex")}`,
    userId: user.id,
    name: body.name,
    email: body.email || null,
    phone: body.phone || null,
    message: body.message || "",
    source: body.source || "webhook",
    status: "new",
    createdAt: new Date().toISOString()
  };
  
  await repository.leads.create(lead);
  await enqueueLeadProcessing(user.id, lead.id);

  const approval = await repository.approvals.getByLeadId(lead.id) || {
    id: `appr_mock_${lead.id}`,
    userId: user.id,
    leadId: lead.id,
    status: "pending",
    draft: "AI follow-up draft is compiling in the background..."
  };

  return send(res, 201, { lead, approval });
}

async function whatsappVerifyWebhook(req, res, url) {
  if (url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN) {
    return send(res, 200, url.searchParams.get("hub.challenge") || "");
  }
  return send(res, 403, { error: "invalid WhatsApp verification token" });
}

async function whatsappWebhook(req, res, store, { readRawBody }) {
  const raw = await readRawBody(req);
  if (!signaturesMatch(raw, req.headers["x-hub-signature-256"], process.env.WHATSAPP_APP_SECRET)) {
    return send(res, 401, { error: "invalid WhatsApp webhook signature" });
  }
  
  const { repository } = require("../app");
  const user = await repository.users.getById(process.env.WHATSAPP_OWNER_USER_ID);
  if (!user) return send(res, 503, { error: "WhatsApp workspace owner is not configured" });
  
  const body = parseJson(raw);
  const messages = (body.entry || []).flatMap((entry) => (entry.changes || []).flatMap((change) => change.value?.messages || []));
  for (const message of messages) {
    const lead = {
      id: `lead_${crypto.randomBytes(8).toString("hex")}`,
      userId: user.id,
      name: message.from || "WhatsApp lead",
      email: null,
      phone: message.from || null,
      message: message.text?.body || "",
      source: "WhatsApp",
      status: "new",
      createdAt: new Date().toISOString()
    };
    await repository.leads.create(lead);
    await enqueueLeadProcessing(user.id, lead.id);
  }
  return send(res, 200, { ok: true, messagesProcessed: messages.length });
}

async function razorpayWebhook(req, res, store, { readRawBody }) {
  const raw = await readRawBody(req);
  if (!signaturesMatch(raw, req.headers["x-razorpay-signature"], process.env.RAZORPAY_WEBHOOK_SECRET)) {
    return send(res, 401, { error: "invalid Razorpay webhook signature" });
  }
  
  const eventId = String(req.headers["x-razorpay-event-id"] || "");
  const { repository } = require("../app");
  
  if (eventId && await repository.processedWebhookEvents.has(eventId)) {
    return send(res, 200, { ok: true, duplicate: true });
  }
  
  const body = parseJson(raw);
  const subscription = body.payload?.subscription?.entity;
  const userId = subscription?.notes?.flowpilot_user_id;
  const user = await repository.users.getById(userId);
  if (user && subscription) {
    user.plan = subscription.status === "active" ? "pro" : user.plan;
    user.billing = { provider: "razorpay", subscriptionId: subscription.id, status: subscription.status, updatedAt: now() };
    await repository.users.update(user.id, { plan: user.plan, billing: user.billing });
    await repository.activity.create({
      userId: user.id,
      type: `billing.${subscription.status}`,
      label: `Razorpay subscription ${subscription.status}`,
      source: "razorpay",
      status: "success"
    });
  }
  
  if (eventId) {
    await repository.processedWebhookEvents.create(eventId);
  }
  return send(res, 200, { ok: true });
}

async function integrationCallback(req, res, store, provider, { APP_ORIGIN }) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const state = verifyOauthState(url.searchParams.get("state"), provider, store);
  if (!state) return send(res, 401, { error: "invalid OAuth state" });
  try {
    const { repository } = require("../app");
    const tokens = await exchangeOauthCode(provider, url.searchParams.get("code"));
    const integration = await repository.integrations.upsert(state.sub, provider, {
      status: "connected",
      encryptedCredentials: encryptSecret(tokens, state.sub)
    });
    
    await repository.activity.create({
      userId: state.sub,
      type: "integration.connected",
      label: `${provider} connected`,
      source: "oauth",
      status: "success"
    });
    return redirect(res, `${APP_ORIGIN}/?integration=${provider}_connected`);
  } catch (error) {
    console.error(`${provider} OAuth callback:`, error.message);
    return redirect(res, `${APP_ORIGIN}/?integration=${provider}_failed`);
  }
}

async function getDashboardAnalytics(req, res, store, user) {
  const { repository } = require("../app");
  const leads = await repository.leads.listByUserId(user.id);
  const approvals = await repository.approvals.listByUserId(user.id);
  const resolved = approvals.filter((a) => a.status !== "pending" && a.resolvedAt && a.createdAt);

  const responseTimes = resolved.map((a) => {
    const durationMs = new Date(a.resolvedAt) - new Date(a.createdAt);
    const durationSeconds = Math.max(0, Math.round(durationMs / 1000));
    const lead = leads.find((l) => l.id === a.leadId) || {};
    return {
      leadId: a.leadId,
      leadName: lead.name || "Unknown",
      durationSeconds
    };
  });

  const totalSeconds = responseTimes.reduce((acc, curr) => acc + curr.durationSeconds, 0);
  const avgResponseTimeSeconds = responseTimes.length ? Math.round(totalSeconds / responseTimes.length) : 0;

  const runs = {
    total: approvals.length,
    approved: approvals.filter((a) => a.status === "approved").length,
    rejected: approvals.filter((a) => a.status === "rejected").length,
    pending: approvals.filter((a) => a.status === "pending").length
  };

  const savedMetrics = {
    timeSavedMinutes: leads.length * 12,
    leadsProcessedCount: leads.length,
    avgResponseTimeSeconds
  };

  const historical = await repository.historicalAnalytics.listByUserId(user.id);

  return send(res, 200, {
    responseTimes,
    runs,
    savedMetrics,
    historical
  });
}

async function getBillingPortal(req, res, store, user, { BILLING_DISABLED }) {
  if (BILLING_DISABLED) return send(res, 404, { error: "billing is disabled for this deployment" });
  const portalUrl = user.billing?.shortUrl || "https://dashboard.razorpay.com";
  return send(res, 200, { url: portalUrl });
}

async function cancelBillingSubscription(req, res, store, user, { BILLING_DISABLED }) {
  if (BILLING_DISABLED) return send(res, 404, { error: "billing is disabled for this deployment" });
  const subId = user.billing?.subscriptionId;
  if (!subId) return send(res, 400, { error: "No active subscription found" });

  const { repository } = require("../app");

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    user.billing.status = "cancelled";
    user.billing.updatedAt = now();
    user.plan = "free";
    await repository.users.update(user.id, { billing: user.billing, plan: user.plan });
    await repository.activity.create({
      userId: user.id,
      type: "billing.cancelled",
      label: "Razorpay subscription cancelled (simulation)",
      source: "razorpay",
      status: "success"
    });
    return send(res, 200, { billing: user.billing });
  }

  try {
    const credentials = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
    const response = await fetch(`https://api.razorpay.com/v1/subscriptions/${subId}/cancel`, {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
      body: JSON.stringify({ cancel_at_cycle_end: 1 }),
      signal: AbortSignal.timeout(12000)
    });

    const resBody = await response.json();
    if (!response.ok) {
      return send(res, response.status, { error: resBody.error?.description || "Could not cancel Razorpay subscription" });
    }

    user.billing.status = "cancelled";
    user.billing.updatedAt = now();
    await repository.users.update(user.id, { billing: user.billing });
    await repository.activity.create({
      userId: user.id,
      type: "billing.cancelled",
      label: `Razorpay subscription cancellation requested for ${subId}`,
      source: "razorpay",
      status: "success"
    });

    return send(res, 200, { billing: user.billing, details: resBody });
  } catch (err) {
    return send(res, 502, { error: err.message });
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
  getDashboardAnalytics,
  getBillingPortal,
  cancelBillingSubscription,
};
