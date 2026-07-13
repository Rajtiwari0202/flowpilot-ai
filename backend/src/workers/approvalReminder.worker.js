const { Worker } = require("bullmq");
const crypto = require("crypto");
const { deliverAccountEmail } = require("../services/auth.service");
const { structuredLog } = require("../utils/logger");
const { registerMockHandler, getRedisConnection } = require("../services/queue.service");

async function processApprovalReminder(job) {
  const { userId } = job.data;
  structuredLog("info", "worker.approval_reminder.started", { userId });

  try {
    const { repository } = require("../app");
    const user = await repository.users.getById(userId);
    if (!user) {
      structuredLog("error", "worker.approval_reminder.user_not_found", { userId });
      return { sent: false };
    }

    const approvals = await repository.approvals.listByUserId(userId);
    const pendingApprovalsCount = approvals.filter(a => a.status === "pending").length;

    if (pendingApprovalsCount === 0) {
      structuredLog("info", "worker.approval_reminder.no_pending", { userId });
      return { sent: false };
    }

    const mailItem = {
      id: `mail_${crypto.randomBytes(8).toString("hex")}`,
      userId,
      toEmail: user.email,
      to: user.email,
      kind: "approval_reminder",
      status: "queued",
      link: `${process.env.APP_ORIGIN || "http://localhost:3000"}/?page=approvals`,
      createdAt: new Date().toISOString(),
      sentAt: null
    };

    await repository.outbox.create(mailItem);

    // Call outbox mail service dispatcher which will update outbox record status on success
    try {
      await deliverAccountEmail(mailItem);
    } catch (deliverErr) {
      structuredLog("error", "worker.approval_reminder.deliver_failed", { userId, error: deliverErr.message });
      await repository.outbox.update(mailItem.id, { status: "failed" });
      throw deliverErr;
    }

    structuredLog("info", "worker.approval_reminder.completed", { userId, pendingCount: pendingApprovalsCount });
    return { sent: true, mailId: mailItem.id };
  } catch (err) {
    structuredLog("error", "worker.approval_reminder.failed", { userId, error: err.message });
    throw err;
  }
}

// Register for Mock Queue fallback
registerMockHandler("approval-reminder", processApprovalReminder);

function startWorker() {
  const connection = getRedisConnection();
  if (!connection) return null;

  const worker = new Worker("approval-reminder", processApprovalReminder, {
    connection,
    concurrency: 1
  });

  worker.on("failed", (job, err) => {
    structuredLog("error", "worker.approval_reminder.job_failed", { jobId: job.id, error: err.message });
  });

  return worker;
}

module.exports = {
  processApprovalReminder,
  startWorker
};
