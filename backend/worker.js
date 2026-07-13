const { startWorker: startGmailSyncWorker } = require("./src/workers/gmailSync.worker");
const { startWorker: startLeadProcessingWorker } = require("./src/workers/leadProcessing.worker");
const { startWorker: startApprovalReminderWorker } = require("./src/workers/approvalReminder.worker");
const { structuredLog } = require("./src/utils/logger");
const { createRepository } = require("./repository");
const { SEED_STORE_PATH, STORE_PATH } = require("./src/config/env");
const { enqueueGmailSync } = require("./src/services/queue.service");

console.log("Starting FlowPilot background automation workers...");

const repository = createRepository({ seedStorePath: SEED_STORE_PATH, storePath: STORE_PATH });
const gmailWorker = startGmailSyncWorker();
const leadWorker = startLeadProcessingWorker();
const reminderWorker = startApprovalReminderWorker();

// Safe parallel concurrency executor
async function runWithLimit(concurrency, items, fn) {
  const results = [];
  const executing = new Set();
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    results.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean, clean);
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
}

// Scheduled background polling for connected Gmail accounts
const POLL_INTERVAL = 10 * 60 * 1000; // 10 minutes

async function pollGmailAccounts() {
  try {
    const connectedAccounts = await repository.integrations.listConnectedGmail();
    
    structuredLog("info", "worker.poll_gmail_scheduler.checking", {
      count: connectedAccounts.length
    });

    // Batch sync insertions with max concurrency of 5
    await runWithLimit(5, connectedAccounts, async (integration) => {
      await enqueueGmailSync(integration.userId);
    });
  } catch (err) {
    structuredLog("error", "worker.poll_gmail_scheduler.failed", { error: err.message });
  }
}

// Scheduled outbox crash recovery poller (every 5 minutes)
const OUTBOX_RECOVERY_INTERVAL = 5 * 60 * 1000;

async function recoverQueuedEmails() {
  try {
    const outbox = await repository.outbox.list();
    const queuedItems = outbox.filter(item => item.status === "queued");
    if (queuedItems.length === 0) return;

    structuredLog("info", "worker.outbox_recovery.started", { count: queuedItems.length });
    const { deliverAccountEmail } = require("./src/services/auth.service");
    
    for (const item of queuedItems) {
      try {
        await deliverAccountEmail(item);
        structuredLog("info", "worker.outbox_recovery.delivered", { mailId: item.id });
      } catch (err) {
        structuredLog("error", "worker.outbox_recovery.failed", { mailId: item.id, error: err.message });
      }
    }
  } catch (err) {
    structuredLog("error", "worker.outbox_recovery.error", { error: err.message });
  }
}

// Start polling
pollGmailAccounts();
recoverQueuedEmails();
const pollTimer = setInterval(pollGmailAccounts, POLL_INTERVAL);
const recoveryTimer = setInterval(recoverQueuedEmails, OUTBOX_RECOVERY_INTERVAL);

// Graceful exit handlers
let shuttingDown = false;
async function gracefulShutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  structuredLog("info", "worker.shutting_down", { message: "Gracefully stopping background daemon..." });
  clearInterval(pollTimer);
  clearInterval(recoveryTimer);

  // Close BullMQ workers
  const workers = [gmailWorker, leadWorker, reminderWorker].filter(Boolean);
  for (const w of workers) {
    try {
      await w.close();
    } catch (err) {
      structuredLog("error", "worker.close.error", { error: err.message });
    }
  }

  // Close active BullMQ queues & Redis connections
  const queueService = require("./src/services/queue.service");
  try {
    await queueService.close();
  } catch (err) {
    structuredLog("error", "queue.service.close.error", { error: err.message });
  }

  // Close Database connection if appropriate
  try {
    if (repository && typeof repository.close === "function") {
      await repository.close();
    }
  } catch (err) {
    structuredLog("error", "repository.close.error", { error: err.message });
  }

  structuredLog("info", "worker.graceful_shutdown.completed");
  process.exit(0);
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

if (!process.env.REDIS_URL) {
  structuredLog("warn", "worker.started_mock_mode", {
    message: "No REDIS_URL provided. Workers running in synchronous mock fallback mode."
  });
} else {
  structuredLog("info", "worker.started_all", {
    gmailSync: !!gmailWorker,
    leadProcessing: !!leadWorker,
    approvalReminder: !!reminderWorker
  });
}
