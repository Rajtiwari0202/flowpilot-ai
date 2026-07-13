const { Worker } = require("bullmq");
const crypto = require("crypto");
const { draftFollowUp } = require("../services/user.service");
const { syncHubspotLead } = require("../services/oauth.service");
const { structuredLog } = require("../utils/logger");
const { registerMockHandler, getRedisConnection } = require("../services/queue.service");

async function processLead(job) {
  const { userId, leadId } = job.data;
  structuredLog("info", "worker.lead_processing.started", { userId, leadId });

  try {
    const { repository } = require("../app");
    const user = await repository.users.getById(userId);
    const lead = await repository.leads.getById(leadId);
    
    if (!user || !lead) {
      structuredLog("error", "worker.lead_processing.missing_records", { userId, leadId });
      return;
    }

    // 1. Check if approval draft already exists to prevent duplicate generation
    const exists = await repository.approvals.getByLeadId(leadId);
    if (exists) {
      structuredLog("info", "worker.lead_processing.skipped_duplicate", { leadId });
      return { approvalId: exists.id };
    }

    const business = await repository.businesses.getByUserId(userId) || { name: "Company", tone: "professional" };

    // 2. Generate AI Follow-Up Draft
    const draftTextResponse = await draftFollowUp({
      leadName: lead.name,
      businessName: business.name,
      tone: business.tone,
      message: lead.message
    });
    const draftText = draftTextResponse.draft;

    // 3. Create Approval Row
    const approval = {
      id: `appr_${crypto.randomBytes(8).toString("hex")}`,
      userId,
      leadId,
      status: "pending",
      kind: "follow_up_draft",
      draft: draftText,
      aiProvider: draftTextResponse.provider,
      deliveryProvider: (lead.source === "WhatsApp" || (lead.phone && !lead.email)) ? "whatsapp" : "gmail",
      createdAt: new Date().toISOString(),
      resolvedAt: null
    };

    try {
      await repository.approvals.create(approval);
    } catch (err) {
      if (err.code === "23505" || err.message.includes("unique") || err.message.includes("duplicate")) {
        structuredLog("info", "worker.lead_processing.skipped_duplicate_approval", { leadId });
        const existing = await repository.approvals.getByLeadId(leadId);
        return { approvalId: existing.id };
      }
      throw err;
    }

    // Update lead status to trigger approval queue listing
    await repository.leads.update(leadId, { status: "pending_approval" });

    // 4. Sync CRM (HubSpot)
    try {
      await syncHubspotLead(null, user, lead);
    } catch (crmErr) {
      structuredLog("warn", "worker.lead_processing.crm_sync_failed", { leadId, error: crmErr.message });
    }

    // 5. Log User Activity using repository
    await repository.activity.create({
      userId,
      type: "lead.created",
      label: `New lead captured: ${lead.name} (${lead.source})`,
      source: lead.source,
      status: "success"
    });

    structuredLog("info", "worker.lead_processing.completed", { userId, leadId, approvalId: approval.id });
    return { approvalId: approval.id };
  } catch (err) {
    structuredLog("error", "worker.lead_processing.failed", { userId, leadId, error: err.message });
    throw err;
  }
}

// Register for Mock Queue fallback
registerMockHandler("lead-processing", processLead);

function startWorker() {
  const connection = getRedisConnection();
  if (!connection) return null;

  const worker = new Worker("lead-processing", processLead, {
    connection,
    concurrency: 1
  });

  worker.on("failed", (job, err) => {
    structuredLog("error", "worker.lead_processing.job_failed", { jobId: job.id, error: err.message });
  });

  return worker;
}

module.exports = {
  processLead,
  startWorker
};
