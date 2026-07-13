const { Queue } = require("bullmq");
const IORedis = require("ioredis");
const { structuredLog } = require("../utils/logger");

const REDIS_URL = process.env.REDIS_URL;
let connection = null;

const activeQueues = {};
const mockWorkerHandlers = {};

function getRedisConnection() {
  if (!REDIS_URL) return null;
  if (!connection) {
    connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null // Required by BullMQ
    });
    connection.on("error", (err) => {
      structuredLog("error", "redis.connection.error", { message: err.message });
    });
  }
  return connection;
}

function registerMockHandler(jobName, handler) {
  mockWorkerHandlers[jobName] = handler;
}

function getQueue(queueName) {
  const conn = getRedisConnection();
  if (conn) {
    if (!activeQueues[queueName]) {
      activeQueues[queueName] = new Queue(queueName, { connection: conn });
      structuredLog("info", "queue.initialized", { queueName });
    }
    return activeQueues[queueName];
  }

  // Fallback Mock Queue for local-JSON/test environments
  return {
    async add(jobName, data, opts = {}) {
      structuredLog("warn", "queue.mock.add", { queueName, jobName, jobId: opts.jobId });
      let result = null;
      try {
        const handler = mockWorkerHandlers[queueName];
        if (handler) {
          result = await handler({ name: jobName, data });
        } else {
          structuredLog("warn", "queue.mock.missing_handler", { queueName, jobName });
        }
      } catch (err) {
        structuredLog("error", "queue.mock.job_failed", { queueName, jobName, error: err.message });
        throw err;
      }
      return { id: opts.jobId || `mock_${Date.now()}`, result };
    }
  };
}

const gmailSyncQueue = getQueue("gmail-sync");
const leadProcessingQueue = getQueue("lead-processing");
const approvalReminderQueue = getQueue("approval-reminder");

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5000
  },
  removeOnComplete: { age: 86400 },
  removeOnFail: { age: 604800 }
};

async function enqueueGmailSync(userId) {
  const jobId = `sync_${userId}_${Math.floor(Date.now() / (1000 * 60 * 15))}`;
  return gmailSyncQueue.add("sync", { userId }, { 
    ...defaultJobOptions,
    jobId, 
    attempts: 5
  });
}

async function enqueueLeadProcessing(userId, leadId) {
  return leadProcessingQueue.add("process", { userId, leadId }, defaultJobOptions);
}

async function enqueueApprovalReminder(userId) {
  return approvalReminderQueue.add("reminder", { userId }, defaultJobOptions);
}

async function close() {
  structuredLog("info", "queue.service.closing");
  for (const name in activeQueues) {
    try {
      await activeQueues[name].close();
    } catch (err) {
      structuredLog("error", "queue.close.error", { queue: name, error: err.message });
    }
  }
  if (connection) {
    try {
      await connection.quit();
      connection = null;
    } catch (err) {
      structuredLog("error", "redis.quit.error", { error: err.message });
    }
  }
}

module.exports = {
  gmailSyncQueue,
  leadProcessingQueue,
  approvalReminderQueue,
  enqueueGmailSync,
  enqueueLeadProcessing,
  enqueueApprovalReminder,
  registerMockHandler,
  getRedisConnection,
  close
};
