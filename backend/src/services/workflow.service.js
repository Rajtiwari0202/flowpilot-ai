const crypto = require("crypto");
const { structuredLog } = require("../utils/logger");

const executionTracker = new Map();

function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function evaluateConditions(conditions, payload) {
  if (!conditions || !Array.isArray(conditions) || conditions.length === 0) return true;
  
  for (const cond of conditions) {
    const val = getNestedValue(payload, cond.field);
    const target = cond.value;
    
    switch (cond.operator) {
      case "equals":
        if (String(val) !== String(target)) return false;
        break;
      case "not_equals":
        if (String(val) === String(target)) return false;
        break;
      case "contains":
        if (!String(val).toLowerCase().includes(String(target).toLowerCase())) return false;
        break;
      default:
        break;
    }
  }
  return true;
}

const actionRegistry = {
  generate_draft: async (workspaceId, action, context) => {
    const { analyzeLeadAndGenerate } = require("./ai.service");
    const { lead, business } = context;
    if (!lead || !business) {
      throw new Error("Context missing lead or business configurations for generate_draft");
    }
    const analysis = await analyzeLeadAndGenerate(workspaceId, {
      leadName: lead.name,
      businessName: business.name,
      tone: business.tone,
      message: lead.message
    });
    context.analysis = analysis;
    context.draft = analysis.draft;
    return analysis;
  },
  create_approval: async (workspaceId, action, context) => {
    const { repository } = require("../app");
    const { lead, userId, draft, analysis } = context;
    if (!lead) {
      throw new Error("Context missing lead configurations for create_approval");
    }
    const approval = {
      id: `appr_${crypto.randomBytes(8).toString("hex")}`,
      userId: userId || lead.userId || "usr_mock",
      workspaceId,
      workspace_id: workspaceId,
      leadId: lead.id,
      status: "pending",
      kind: "follow_up_draft",
      draft: draft || context.draft || "Follow up email",
      aiProvider: analysis?.provider || context.analysis?.provider || "local",
      promptVersion: analysis?.prompt_version || context.analysis?.prompt_version || null,
      prompt_version: analysis?.prompt_version || context.analysis?.prompt_version || null,
      confidence: analysis?.confidence || context.analysis?.confidence || null,
      deliveryProvider: (lead.source === "WhatsApp" || (lead.phone && !lead.email)) ? "whatsapp" : "gmail",
      createdAt: new Date().toISOString(),
      resolvedAt: null
    };
    await repository.approvals.create(workspaceId, approval);
    context.approval = approval;
    return approval;
  },
  send_email: async (workspaceId, action, context) => {
    const { repository } = require("../app");
    const { lead, userId, draft } = context;
    if (!lead || !lead.email) {
      throw new Error("Context missing recipient email address for send_email");
    }
    const emailBody = draft || context.draft || "Follow up email text";
    const mailItem = {
      id: `mail_${crypto.randomBytes(8).toString("hex")}`,
      userId: userId || lead.userId || "usr_mock",
      toEmail: lead.email,
      to: lead.email,
      kind: "lead_follow_up",
      status: "queued",
      link: null,
      createdAt: new Date().toISOString(),
      sentAt: null,
      workspaceId,
      workspace_id: workspaceId
    };
    await repository.outbox.create(mailItem);
    return mailItem;
  },
  create_activity: async (workspaceId, action, context) => {
    const { repository } = require("../app");
    const { userId, lead } = context;
    const label = action.config?.label || `Workflow action executed`;
    const activity = {
      userId: userId || lead?.userId || "usr_mock",
      type: action.config?.type || "workflow.action",
      label,
      source: lead?.source || "system",
      status: "success",
      createdAt: new Date().toISOString()
    };
    return repository.activity.create(workspaceId, activity);
  }
};

async function executeWorkflow(workspaceId, workflow, payload) {
  if (!workspaceId) throw new Error("Workspace context required");
  const { repository } = require("../app");

  const runId = `wrun_${crypto.randomBytes(8).toString("hex")}`;
  const runRecord = {
    id: runId,
    workspaceId,
    workspace_id: workspaceId,
    workflowId: workflow.id,
    triggerKey: workflow.triggerKey || workflow.trigger_key,
    status: "running",
    attemptCount: 1,
    errorMessage: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
    createdAt: new Date().toISOString()
  };

  await repository.workflowRuns.create(workspaceId, runRecord);

  // Setup execution context
  const context = {
    userId: payload.userId,
    lead: payload.lead,
    business: payload.business,
    draft: payload.draft,
    analysis: payload.analysis
  };

  // Resolve business profile if missing from context
  if (context.userId && !context.business) {
    try {
      context.business = await repository.businesses.getByUserId(context.userId);
    } catch (e) {
      console.warn("Failed to fetch business for workflow context:", e.message);
    }
  }

  // Loop recursion protection
  const leadId = payload.lead?.id || "unknown";
  const runKey = `loop:${leadId}:${workflow.id}`;
  let isRateLimited = false;

  const { getRedisConnection } = require("./queue.service");
  const redis = getRedisConnection();
  if (redis) {
    try {
      const multi = redis.multi();
      multi.incr(runKey);
      multi.ttl(runKey);
      const results = await multi.exec();
      const currentCount = results[0][1];
      const ttl = results[1][1];
      if (ttl === -1) {
        await redis.expire(runKey, 600);
      }
      if (currentCount > 5) {
        isRateLimited = true;
      }
    } catch (redisErr) {
      console.warn("Redis loop check failed, falling back to local Map:", redisErr.message);
    }
  }

  if (!redis || isRateLimited === false) {
    const trackerKey = `${leadId}:${workflow.id}`;
    const currentCount = executionTracker.get(trackerKey) || 0;
    if (currentCount >= 5) {
      isRateLimited = true;
    } else {
      executionTracker.set(trackerKey, currentCount + 1);
      setTimeout(() => {
        const count = executionTracker.get(trackerKey);
        if (count <= 1) {
          executionTracker.delete(trackerKey);
        } else {
          executionTracker.set(trackerKey, count - 1);
        }
      }, 600000); // 10 minutes expiry window
    }
  }

  if (isRateLimited) {
    const recursionErr = new Error(`Workflow execution recursion threshold exceeded (Max 5 runs per lead context)`);
    structuredLog("error", "workflow.execution.recursion_prevented", { workflowId: workflow.id, leadId, error: recursionErr.message });
    throw recursionErr;
  }

  try {
    await repository.transaction(workspaceId, async (tx) => {
      const actions = workflow.actions || [];
      for (const action of actions) {
        const executor = actionRegistry[action.type];
        if (!executor) {
          throw new Error(`Unsupported workflow action executor: ${action.type}`);
        }
        await executor(workspaceId, action, context, tx);
      }
    });

    // Success completion update
    await repository.workflowRuns.update(workspaceId, runId, {
      status: "completed",
      completedAt: new Date().toISOString()
    });

    structuredLog("info", "workflow.execution.completed", { workflowId: workflow.id, runId });
    return { status: "completed", runId };

  } catch (err) {
    structuredLog("error", "workflow.execution.failed", { workflowId: workflow.id, runId, error: err.message });
    
    // Failure execution update
    await repository.workflowRuns.update(workspaceId, runId, {
      status: "failed",
      errorMessage: err.message
    });

    const { notifyWorkspaceUsers } = require("./notification.service");
    try {
      await notifyWorkspaceUsers(workspaceId, {
        roles: ["owner", "admin"],
        type: "workflow_failed",
        title: "Workflow Execution Failed",
        message: `Workflow "${workflow.name || "Workflow"}" failed: ${err.message}`,
        metadata: { workflowId: workflow.id, runId }
      });
    } catch (notifErr) {
      console.warn("Failed to dispatch workflow failure notification:", notifErr.message);
    }

    return { status: "failed", runId, error: err.message };
  }
}

async function executeTrigger(workspaceId, triggerKey, payload) {
  if (!workspaceId) throw new Error("Workspace context required");
  const { repository } = require("../app");

  structuredLog("info", "workflow.trigger.received", { workspaceId, triggerKey });

  // List all workflow records for tenant
  const workflows = await repository.workflows.listByWorkspaceId(workspaceId);
  const activeMatching = workflows.filter(w => 
    (w.triggerKey === triggerKey || w.trigger_key === triggerKey) && 
    w.status === "active"
  );

  const runs = [];
  for (const workflow of activeMatching) {
    // Evaluate execution conditions
    if (!evaluateConditions(workflow.conditions, payload)) {
      structuredLog("info", "workflow.trigger.skipped_conditions", { workflowId: workflow.id, triggerKey });
      continue;
    }
    const result = await executeWorkflow(workspaceId, workflow, payload);
    runs.push(result);
  }

  return runs;
}

module.exports = {
  actionRegistry,
  evaluateConditions,
  executeWorkflow,
  executeTrigger
};
