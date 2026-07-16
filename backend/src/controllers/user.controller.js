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

// Safely scope active workspace context
async function getWorkspaceId(req, user) {
  if (req.workspaceId) return req.workspaceId;
  const workspaceId = req.headers["x-workspace-id"] || req.query?.workspaceId || req.body?.workspaceId;
  if (workspaceId) return workspaceId;
  const { repository } = require("../app");
  const business = await repository.businesses.getByUserId(user?.id);
  return business?.id;
}

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
      name: body.name !== undefined ? body.name : business.name,
      type: body.type !== undefined ? body.type : business.type,
      tone: body.tone !== undefined ? body.tone : business.tone,
      goals: Array.isArray(body.goals) ? body.goals : business.goals,
      updatedAt: now()
    };
    Object.assign(business, updates);
    await repository.businesses.updateByUserId(user.id, updates);
  }
  const workspaceId = business.id;
  await repository.activity.create(workspaceId, { userId: user.id, type: "business.updated", label: "Business profile updated", source: "onboarding", status: "success" });
  return send(res, 200, { business });
}

async function getDashboard(req, res, store, user) {
  const workspaceId = await getWorkspaceId(req, user);
  return send(res, 200, await dashboardFor(user, workspaceId));
}

async function getWorkflows(req, res, store, user) {
  const { repository } = require("../app");
  const workspaceId = await getWorkspaceId(req, user);
  const workflows = await repository.workflows.listByWorkspaceId(workspaceId);
  return send(res, 200, { workflows });
}

async function getLeads(req, res, store, user) {
  const { repository } = require("../app");
  const workspaceId = await getWorkspaceId(req, user);

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const options = {
    search: url.searchParams.get("search") || undefined,
    status: url.searchParams.get("status") || undefined,
    assignedTo: url.searchParams.get("assigned_to") || url.searchParams.get("assignedTo") || undefined,
    page: url.searchParams.get("page") || undefined,
    limit: url.searchParams.get("limit") || undefined
  };

  const leads = await repository.leads.listByWorkspaceId(workspaceId, options);
  return send(res, 200, { leads });
}

async function getApprovals(req, res, store, user) {
  const { repository } = require("../app");
  const workspaceId = await getWorkspaceId(req, user);
  const approvals = await repository.approvals.listByWorkspaceId(workspaceId);
  const leads = await repository.leads.listByWorkspaceId(workspaceId);
  const enriched = approvals.map((approval) => ({
    ...approval,
    lead: leads.find((lead) => lead.id === approval.leadId) || null
  }));
  return send(res, 200, { approvals: enriched });
}

async function getIntegrations(req, res, store, user) {
  const { repository } = require("../app");
  const workspaceId = await getWorkspaceId(req, user);
  const integrations = await repository.integrations.listByWorkspaceId(workspaceId);
  return send(res, 200, { integrations });
}

async function createWorkflowFromTemplate(req, res, store, user) {
  const body = await parseBody(req);
  const { repository } = require("../app");
  const workspaceId = await getWorkspaceId(req, user);
  const template = await repository.templates.getById(body.templateId);
  if (!template) return send(res, 404, { error: "template not found" });
  
  const workflows = await repository.workflows.listByWorkspaceId(workspaceId);
  if (workflows.some((item) => item.templateId === template.id)) {
    return send(res, 409, { error: "workflow template is already active" });
  }
  
  const workflow = {
    id: id("wf"),
    userId: user.id,
    workspaceId,
    workspace_id: workspaceId,
    name: body.name || template.title,
    status: "active",
    triggerKey: template.triggerKey,
    actions: template.actions,
    runs: 0,
    createdAt: now(),
    updatedAt: now()
  };
  await repository.workflows.create(workspaceId, workflow);
  
  const { logAuditAction } = require("../services/auditLog.service");
  await logAuditAction(workspaceId, {
    actorId: user.id,
    entityType: "workflow",
    entityId: workflow.id,
    action: "workflow.created",
    afterState: workflow
  });

  await repository.activity.create(workspaceId, { userId: user.id, type: "workflow.created", label: `${workflow.name} activated`, source: "templates", status: "success" });
  return send(res, 201, { workflow });
}

async function updateWorkflowStatus(req, res, store, user, workflowId) {
  const body = await parseBody(req);
  const { repository } = require("../app");
  const workspaceId = await getWorkspaceId(req, user);
  const workflow = await repository.workflows.getById(workspaceId, workflowId);
  if (!workflow || workflow.userId !== user.id) return send(res, 404, { error: "workflow not found" });
  
  const updates = { updatedAt: now() };
  if (["active", "paused"].includes(body.status)) {
    updates.status = body.status;
    workflow.status = body.status;
  }
  
  await repository.workflows.update(workspaceId, workflowId, updates);

  const { logAuditAction } = require("../services/auditLog.service");
  await logAuditAction(workspaceId, {
    actorId: user.id,
    entityType: "workflow",
    entityId: workflowId,
    action: "workflow.updated",
    afterState: workflow
  });

  await repository.activity.create(workspaceId, { userId: user.id, type: "workflow.updated", label: `${workflow.name} ${workflow.status}`, source: "dashboard", status: "success" });
  return send(res, 200, { workflow });
}

async function createLead(req, res, store, user) {
  const body = await parseBody(req);
  const { repository } = require("../app");
  const workspaceId = await getWorkspaceId(req, user);
  
  const lead = {
    id: `lead_${crypto.randomBytes(8).toString("hex")}`,
    userId: user.id,
    workspaceId,
    workspace_id: workspaceId,
    name: body.name,
    email: body.email || null,
    phone: body.phone || null,
    message: body.message || "",
    source: body.source || "manual",
    status: "new",
    notes: body.notes || null,
    tags: Array.isArray(body.tags) ? body.tags : [],
    assignedTo: body.assignedTo || body.assigned_to || null,
    createdAt: new Date().toISOString()
  };
  
  await repository.leads.create(workspaceId, lead);

  const { dispatchNotification, notifyWorkspaceUsers } = require("../services/notification.service");
  try {
    const assignedUser = lead.assignedTo || lead.assigned_to;
    if (assignedUser) {
      await dispatchNotification(workspaceId, {
        userId: assignedUser,
        type: "lead_created",
        title: "New Lead Assigned",
        message: `${lead.name} has been assigned to you.`,
        metadata: { leadId: lead.id }
      });
    } else {
      await notifyWorkspaceUsers(workspaceId, {
        roles: ["owner", "admin"],
        type: "lead_created",
        title: "New Lead Ingested",
        message: `${lead.name} has been added and needs review.`,
        metadata: { leadId: lead.id }
      });
    }
  } catch (notifErr) {
    console.error("Failed to dispatch notifications inside createLead:", notifErr.message);
  }
  
  const { logAuditAction } = require("../services/auditLog.service");
  await logAuditAction(workspaceId, {
    actorId: user.id,
    entityType: "lead",
    entityId: lead.id,
    action: "lead.created",
    afterState: lead
  });
  await enqueueLeadProcessing(user.id, lead.id);

  const approval = await repository.approvals.getByLeadId(workspaceId, lead.id) || {
    id: `appr_mock_${lead.id}`,
    userId: user.id,
    workspaceId,
    workspace_id: workspaceId,
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
  const workspaceId = await getWorkspaceId(req, user);
  const activity = await repository.activity.listByWorkspaceId(workspaceId);
  return send(res, 200, { activity });
}

async function resolveApproval(req, res, store, user, approvalId, action, { sendGmailFollowUp }) {
  const { repository } = require("../app");
  const workspaceId = await getWorkspaceId(req, user);
  const approval = await repository.approvals.getById(workspaceId, approvalId);
  if (!approval || approval.userId !== user.id) return send(res, 404, { error: "approval not found" });
  
  const body = await parseBody(req);
  if (typeof body.draft === "string" && body.draft.trim()) {
    approval.draft = body.draft.trim();
  }
  
  approval.status = action === "approve" ? "approved" : "rejected";
  approval.resolvedAt = now();
  
  await repository.approvals.update(workspaceId, approvalId, {
    draft: approval.draft,
    status: approval.status,
    resolvedAt: approval.resolvedAt
  });
  
  const crypto = require("crypto");
  const actionRecord = {
    id: `apact_${crypto.randomBytes(8).toString("hex")}`,
    workspaceId,
    workspace_id: workspaceId,
    approvalId,
    actorId: user.id,
    action: action === "approve" ? "approved" : "rejected",
    notes: body.notes || null,
    createdAt: new Date().toISOString()
  };
  await repository.approvalActions.create(workspaceId, actionRecord);

  const { logAuditAction } = require("../services/auditLog.service");
  await logAuditAction(workspaceId, {
    actorId: user.id,
    entityType: "approval",
    entityId: approvalId,
    action: `approval.${approval.status}`,
    afterState: approval
  });
  
  const lead = await repository.leads.getById(workspaceId, approval.leadId);
  if (lead) {
    const beforeState = { status: lead.status };
    lead.status = approval.status === "approved" ? "follow_up_sent" : "needs_review";
    await repository.leads.update(workspaceId, lead.id, { status: lead.status });

    await logAuditAction(workspaceId, {
      actorId: user.id,
      entityType: "lead",
      entityId: lead.id,
      action: "lead.updated",
      beforeState,
      afterState: lead
    });
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
    await repository.approvals.update(workspaceId, approvalId, { deliveryProvider: approval.deliveryProvider });
    
    const workflows = await repository.workflows.listByWorkspaceId(workspaceId);
    const activeWorkflow = workflows.find((item) => item.status === "active");
    if (activeWorkflow) {
      await repository.workflows.incrementRuns(workspaceId, activeWorkflow.id);
    }

    // Trigger workflow engine on approval
    const { executeTrigger } = require("../services/workflow.service");
    try {
      await executeTrigger(workspaceId, "approval.approved", {
        userId: user.id,
        lead,
        approval
      });
    } catch (triggerErr) {
      console.error("Workflow trigger approval.approved failed:", triggerErr.message);
    }
  }
  
  const { notifyWorkspaceUsers } = require("../services/notification.service");
  try {
    await notifyWorkspaceUsers(workspaceId, {
      roles: ["owner", "admin"],
      type: approval.status === "approved" ? "approval_approved" : "approval_rejected",
      title: approval.status === "approved" ? "Draft Approved" : "Draft Rejected",
      message: `Follow-up draft for ${lead?.name || "Lead"} has been ${approval.status} by ${user.email || user.id}.`,
      metadata: { leadId: approval.leadId, approvalId }
    });
  } catch (notifErr) {
    console.error("Failed to dispatch resolved approval notifications:", notifErr.message);
  }

  const { captureEvent } = require("../services/observability.service");
  captureEvent(user.id, "approval_resolved", { action, provider: approval.deliveryProvider });

  await repository.activity.create(workspaceId, {
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
  const workspaceId = await getWorkspaceId(req, user);
  const authorizationUrl = await oauthAuthorizationUrl(store, user.id, provider, {});
  if (authorizationUrl) return send(res, 200, { provider, authorizationUrl, mode: "oauth" });
  
  const integration = await repository.integrations.upsert(workspaceId, provider, { status: "connected", userId: user.id });
  await repository.activity.create(workspaceId, {
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
  
  const workspaceId = (await repository.businesses.getByUserId(userId))?.id;
  if (!workspaceId) return send(res, 400, { error: "webhook owner workspace not found" });

  const body = await parseBody(req);
  const lead = {
    id: `lead_${crypto.randomBytes(8).toString("hex")}`,
    userId: user.id,
    workspaceId,
    workspace_id: workspaceId,
    name: body.name,
    email: body.email || null,
    phone: body.phone || null,
    message: body.message || "",
    source: body.source || "webhook",
    status: "new",
    createdAt: new Date().toISOString()
  };
  
  await repository.leads.create(workspaceId, lead);
  await enqueueLeadProcessing(user.id, lead.id);

  const approval = await repository.approvals.getByLeadId(workspaceId, lead.id) || {
    id: `appr_mock_${lead.id}`,
    userId: user.id,
    workspaceId,
    workspace_id: workspaceId,
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

  const workspaceId = (await repository.businesses.getByUserId(user.id))?.id;
  if (!workspaceId) return send(res, 503, { error: "WhatsApp workspace owner workspace not found" });
  
  const body = parseJson(raw);
  const messages = (body.entry || []).flatMap((entry) => (entry.changes || []).flatMap((change) => change.value?.messages || []));
  for (const message of messages) {
    const lead = {
      id: `lead_${crypto.randomBytes(8).toString("hex")}`,
      userId: user.id,
      workspaceId,
      workspace_id: workspaceId,
      name: message.from || "WhatsApp lead",
      email: null,
      phone: message.from || null,
      message: message.text?.body || "",
      source: "WhatsApp",
      status: "new",
      createdAt: new Date().toISOString()
    };
    await repository.leads.create(workspaceId, lead);
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
    const workspaceId = (await repository.businesses.getByUserId(userId))?.id;
    user.plan = subscription.status === "active" ? "pro" : user.plan;
    user.billing = { provider: "razorpay", subscriptionId: subscription.id, status: subscription.status, updatedAt: now() };
    await repository.users.update(user.id, { plan: user.plan, billing: user.billing });
    if (workspaceId) {
      await repository.activity.create(workspaceId, {
        userId: user.id,
        type: `billing.${subscription.status}`,
        label: `Razorpay subscription ${subscription.status}`,
        source: "razorpay",
        status: "success"
      });
    }
  }
  
  if (eventId) {
    await repository.processedWebhookEvents.create(eventId);
  }
  return send(res, 200, { ok: true });
}

async function integrationCallback(req, res, store, provider, { APP_ORIGIN }) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const state = await verifyOauthState(url.searchParams.get("state"), provider);
  if (!state) return send(res, 401, { error: "invalid OAuth state" });
  try {
    const { repository } = require("../app");
    const workspaceId = (await repository.businesses.getByUserId(state.sub))?.id;
    if (!workspaceId) throw new Error("Workspace not found for callback exchange");

    const tokens = await exchangeOauthCode(provider, url.searchParams.get("code"), state.verifier);
    const salt = require("crypto").randomBytes(16).toString("hex");
    const integration = await repository.integrations.upsert(workspaceId, provider, {
      status: "connected",
      encryptedCredentials: encryptSecret(tokens, salt),
      encryptionSalt: salt,
      userId: state.sub
    });
    
    await repository.activity.create(workspaceId, {
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
  const workspaceId = await getWorkspaceId(req, user);
  const leads = await repository.leads.listByWorkspaceId(workspaceId);
  const approvals = await repository.approvals.listByWorkspaceId(workspaceId);
  const resolved = approvals.filter((a) => a.status !== "pending" && a.resolvedAt && a.createdAt);

  const leadsMap = new Map(leads.map((l) => [l.id, l]));
  const responseTimes = resolved.map((a) => {
    const durationMs = new Date(a.resolvedAt) - new Date(a.createdAt);
    const durationSeconds = Math.max(0, Math.round(durationMs / 1000));
    const lead = leadsMap.get(a.leadId) || {};
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
  if (!user.billing?.subscriptionId) return send(res, 400, { error: "No active Razorpay subscription found" });
  return send(res, 200, { portalUrl: user.billing.shortUrl || "https://dashboard.razorpay.com" });
}

async function cancelBillingSubscription(req, res, store, user, { writeStore, BILLING_DISABLED }) {
  if (BILLING_DISABLED) return send(res, 404, { error: "billing is disabled for this deployment" });
  if (!user.billing?.subscriptionId) return send(res, 400, { error: "No active subscription found to cancel" });
  
  const credentials = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1/subscriptions/${user.billing.subscriptionId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
    body: JSON.stringify({ cancel_at_cycle_end: false }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) return send(res, response.status, { error: "Could not cancel Razorpay subscription" });
  
  user.billing.status = "cancelled";
  user.billing.updatedAt = now();
  const { repository } = require("../app");
  await repository.users.update(user.id, { billing: user.billing });
  
  return send(res, 200, { billing: user.billing });
}

async function getNotifications(req, res, store, user) {
  const { repository } = require("../app");
  const workspaceId = await getWorkspaceId(req, user);
  
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  const list = await repository.notifications.listByUserId(workspaceId, user.id, { unreadOnly, limit, offset });
  const unreadCount = await repository.notifications.countUnread(workspaceId, user.id);

  return send(res, 200, { notifications: list, unreadCount });
}

async function markNotificationRead(req, res, store, user, notificationId) {
  const { repository } = require("../app");
  const workspaceId = await getWorkspaceId(req, user);

  const updated = await repository.notifications.markAsRead(workspaceId, notificationId, user.id);
  if (!updated) {
    return send(res, 404, { error: "notification not found" });
  }
  return send(res, 200, { notification: updated });
}

async function markAllNotificationsRead(req, res, store, user) {
  const { repository } = require("../app");
  const workspaceId = await getWorkspaceId(req, user);

  await repository.notifications.markAllAsRead(workspaceId, user.id);
  return send(res, 200, { success: true });
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
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
};
