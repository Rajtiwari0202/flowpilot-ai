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

async function dashboardFor(user, workspaceId) {
  const { repository } = require("../app");
  if (!workspaceId) {
    const business = await repository.businesses.getByUserId(user.id);
    workspaceId = business?.id;
  }
  if (!workspaceId) {
    return {
      user: publicUser(user),
      business: null,
      metrics: {
        activeAutomations: 0,
        leadsProcessedToday: 0,
        pendingApprovals: 0,
        errors: 0,
        timeSavedMinutesThisWeek: 0,
        successRate: 100
      },
      workflows: [],
      activity: [],
      approvals: []
    };
  }

  const business = await repository.businesses.getByUserId(user.id);
  const workflows = await repository.workflows.listByWorkspaceId(workspaceId);
  const leads = await repository.leads.listByWorkspaceId(workspaceId);
  const activityList = await repository.activity.listByWorkspaceId(workspaceId);
  const activity = activityList.slice(0, 10);
  const approvals = await repository.approvals.listByWorkspaceId(workspaceId);
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

async function draftFollowUp(input, workspaceId = "biz_mock") {
  const { analyzeLeadAndGenerate } = require("./ai.service");
  return analyzeLeadAndGenerate(workspaceId, input);
}

async function createLeadApproval(user, body, workspaceId) {
  const { repository } = require("../app");
  const { syncHubspotLead } = require("./oauth.service");

  if (!workspaceId) {
    const business = await repository.businesses.getByUserId(user.id);
    workspaceId = business?.id;
  }
  if (!workspaceId) throw new Error("Workspace context required");

  const lead = {
    id: id("lead"),
    userId: user.id,
    workspaceId,
    workspace_id: workspaceId,
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
    await repository.leads.create(workspaceId, lead);
  } catch (err) {
    if (err.code === "23505" || err.message.includes("unique") || err.message.includes("duplicate")) {
      const existing = await repository.leads.getByGmailMessageId(workspaceId, lead.gmailMessageId);
      if (existing) {
        const approval = await repository.approvals.getByLeadId(workspaceId, existing.id);
        return { lead: existing, approval };
      }
    }
    throw err;
  }

  const business = await repository.businesses.getByUserId(user.id);
  const generated = await draftFollowUp({ leadName: lead.name, businessName: business?.name, tone: business?.tone, message: lead.message }, workspaceId);
  
  const approval = {
    id: id("appr"),
    userId: user.id,
    workspaceId,
    workspace_id: workspaceId,
    leadId: lead.id,
    status: "pending",
    kind: "follow_up_draft",
    draft: generated.draft,
    aiProvider: generated.provider,
    promptVersion: generated.prompt_version || null,
    prompt_version: generated.prompt_version || null,
    confidence: generated.confidence || null,
    createdAt: now(),
    resolvedAt: null
  };
  await repository.approvals.create(workspaceId, approval);

  const { dispatchNotification, notifyWorkspaceUsers } = require("./notification.service");
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
      await dispatchNotification(workspaceId, {
        userId: assignedUser,
        type: "approval_required",
        title: "Approval Required",
        message: `AI follow-up draft for ${lead.name} requires your approval.`,
        metadata: { leadId: lead.id, approvalId: approval.id }
      });
    } else {
      await notifyWorkspaceUsers(workspaceId, {
        roles: ["owner", "admin"],
        type: "lead_created",
        title: "New Lead Ingested",
        message: `${lead.name} has been added and needs review.`,
        metadata: { leadId: lead.id }
      });
      await notifyWorkspaceUsers(workspaceId, {
        roles: ["owner", "admin"],
        type: "approval_required",
        title: "Draft Approval Required",
        message: `AI follow-up draft for ${lead.name} is ready for approval.`,
        metadata: { leadId: lead.id, approvalId: approval.id }
      });
    }
  } catch (notifErr) {
    console.error("Failed to dispatch notifications inside user.service.js:", notifErr.message);
  }

  await repository.activity.create(workspaceId, {
    userId: user.id,
    type: "lead.created",
    label: `${lead.name} awaiting approval`,
    source: lead.source,
    status: "pending"
  });

  try {
    const sync = await syncHubspotLead(null, user, lead);
    if (sync.provider === "hubspot") {
      await repository.activity.create(workspaceId, {
        userId: user.id,
        type: "integration.synced",
        label: `${lead.name} synced to HubSpot`,
        source: "hubspot",
        status: "success"
      });
    }
  } catch (error) {
    console.error("HubSpot sync:", error.message);
    await repository.activity.create(workspaceId, {
      userId: user.id,
      type: "integration.error",
      label: `${lead.name} could not sync to HubSpot`,
      source: "hubspot",
      status: "error"
    });
  }

  // Trigger workflows matching lead.created
  const { executeTrigger } = require("./workflow.service");
  try {
    await executeTrigger(workspaceId, "lead.created", {
      userId: user.id,
      lead,
      approval,
      business
    });
  } catch (triggerErr) {
    console.error("Workflow trigger lead.created failed:", triggerErr.message);
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
