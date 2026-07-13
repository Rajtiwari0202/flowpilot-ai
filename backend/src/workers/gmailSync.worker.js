const { Worker } = require("bullmq");
const { syncGmailInbox } = require("../services/gmail.service");
const { structuredLog } = require("../utils/logger");
const { registerMockHandler, getRedisConnection } = require("../services/queue.service");

async function processGmailSync(job) {
  const { userId } = job.data;
  structuredLog("info", "worker.gmail_sync.started", { userId });

  try {
    const { repository } = require("../app");
    const user = await repository.users.getById(userId);
    if (!user) {
      structuredLog("error", "worker.gmail_sync.user_not_found", { userId });
      return { syncedCount: 0 };
    }

    const { createLeadApproval } = require("../services/user.service");
    const result = await syncGmailInbox(user, {
      createLeadApproval
    });

    // Update last sync timestamp on integration record
    await repository.integrations.updateLastSyncedAt(userId, new Date().toISOString());

    structuredLog("info", "worker.gmail_sync.completed", { userId, syncedCount: result.count });
    return { syncedCount: result.count };
  } catch (err) {
    structuredLog("error", "worker.gmail_sync.failed", { userId, error: err.message });
    throw err;
  }
}

// Register for Mock Queue fallback
registerMockHandler("gmail-sync", processGmailSync);

function startWorker() {
  const connection = getRedisConnection();
  if (!connection) return null;

  const worker = new Worker("gmail-sync", processGmailSync, {
    connection,
    concurrency: 1
  });

  worker.on("failed", (job, err) => {
    structuredLog("error", "worker.gmail_sync.job_failed", { jobId: job.id, error: err.message });
  });

  return worker;
}

module.exports = {
  processGmailSync,
  startWorker
};
