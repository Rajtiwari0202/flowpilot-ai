const fs = require("fs");
const {
  mapTemplate,
  mapAuthToken,
  mapOutbox,
  mapHistoricalAnalytics
} = require("./mappers");

const { localUsers } = require("./users.repository");
const { localLeads } = require("./leads.repository");
const { localApprovals } = require("./approvals.repository");
const { localWorkflows } = require("./workflows.repository");
const { localIntegrations } = require("./integrations.repository");
const { localActivity } = require("./activity.repository");
const { localWorkspaceMembers } = require("./workspaceMembers.repository");
const { localGmailSyncState } = require("./gmailSyncState.repository");
const { localWorkspaceAiUsage } = require("./workspaceAiUsage.repository");
const { localWorkflowRuns } = require("./workflowRuns.repository");
const { localApprovalActions } = require("./approvalActions.repository");
const { localAuditLogs } = require("./auditLogs.repository");
const { localNotifications } = require("./notifications.repository");

let writeLock = Promise.resolve();
async function runLocked(fn) {
  const result = writeLock.then(fn);
  writeLock = result.catch(() => {});
  return result;
}

async function readJson(storePath, seedStorePath) {
  if (!fs.existsSync(storePath)) {
    fs.copyFileSync(seedStorePath, storePath);
  }
  return JSON.parse(fs.readFileSync(storePath, "utf8"));
}

async function writeJson(storePath, store) {
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
}

function createLocalRepository({ seedStorePath, storePath }) {
  async function perform(collection, fn) {
    return runLocked(async () => {
      const store = await readJson(storePath, seedStorePath);
      if (!Array.isArray(store[collection])) store[collection] = [];
      const result = await fn(store[collection], store);
      await writeJson(storePath, store);
      return result;
    });
  }

  return {
    mode: "local_json",
    users: localUsers(storePath, seedStorePath, perform),
    workspaceMembers: localWorkspaceMembers(storePath, seedStorePath, perform),
    businesses: {
      async getByUserId(userId) {
        const store = await readJson(storePath, seedStorePath);
        const { mapBusiness } = require("./mappers");
        return mapBusiness(store.businesses?.find(b => (b.userId || b.user_id) === userId));
      },
      async create(business) {
        await perform("businesses", (coll) => coll.push(business));
        return business;
      },
      async updateByUserId(userId, updates) {
        return perform("businesses", (coll) => {
          const { mapBusiness } = require("./mappers");
          const b = coll.find(item => (item.userId || item.user_id) === userId);
          if (b) Object.assign(b, updates);
          return mapBusiness(b);
        });
      }
    },
    integrations: localIntegrations(storePath, seedStorePath, perform),
    templates: {
      async list() {
        const store = await readJson(storePath, seedStorePath);
        return (store.templates || []).map(mapTemplate);
      },
      async getById(id) {
        const store = await readJson(storePath, seedStorePath);
        return mapTemplate(store.templates?.find(t => t.id === id));
      }
    },
    workflows: localWorkflows(storePath, seedStorePath, perform),
    leads: localLeads(storePath, seedStorePath, perform),
    approvals: localApprovals(storePath, seedStorePath, perform),
    activity: localActivity(storePath, seedStorePath, perform),
    authTokens: {
      async create(token) {
        if (token.userId) {
          const store = await readJson(storePath, seedStorePath);
          const exists = store.users?.some(u => u.id === token.userId);
          if (!exists) {
            throw new Error(`Foreign key constraint violation: User with ID ${token.userId} does not exist in users table.`);
          }
        }
        await perform("authTokens", (coll) => coll.push(token));
        return token;
      },
      async getByKindAndHash(kind, tokenHash) {
        const store = await readJson(storePath, seedStorePath);
        return mapAuthToken(store.authTokens?.find(t => t.kind === kind && (t.tokenHash === tokenHash || t.token_hash === tokenHash || t.token === tokenHash)));
      },
      async update(id, updates) {
        return perform("authTokens", (coll) => {
          const t = coll.find(item => item.id === id);
          if (t) Object.assign(t, updates);
          return mapAuthToken(t);
        });
      },
      async delete(id) {
        return perform("authTokens", (coll) => {
          const idx = coll.findIndex(item => item.id === id);
          if (idx !== -1) coll.splice(idx, 1);
        });
      },
      async deleteByUserIdAndKind(userId, kind) {
        return perform("authTokens", (coll) => {
          for (let i = coll.length - 1; i >= 0; i--) {
            const t = coll[i];
            if ((t.userId || t.user_id) === userId && t.kind === kind) {
              coll.splice(i, 1);
            }
          }
        });
      },
      async consumeOauthState(token, kind) {
        return runLocked(async () => {
          const store = await readJson(storePath, seedStorePath);
          const idx = store.authTokens?.findIndex(t => t.kind === kind && (t.token === token || t.tokenHash === token || t.token_hash === token || String(t.tokenHash || t.token_hash || "").startsWith(token + ":")) && new Date(t.expiresAt || t.expires_at) > new Date()) ?? -1;
          if (idx === -1) return null;
          const match = store.authTokens[idx];
          store.authTokens.splice(idx, 1);
          await writeJson(storePath, store);
          return mapAuthToken(match);
        });
      }
    },
    outbox: {
      async create(item) {
        await perform("outbox", (coll) => coll.push(item));
        return mapOutbox(item);
      },
      async update(id, updates) {
        return perform("outbox", (coll) => {
          const o = coll.find(item => item.id === id);
          if (o) Object.assign(o, updates);
          return mapOutbox(o);
        });
      },
      async list() {
        const store = await readJson(storePath, seedStorePath);
        return (store.outbox || []).map(mapOutbox);
      }
    },
    historicalAnalytics: {
      async listByUserId(userId) {
        const store = await readJson(storePath, seedStorePath);
        return (store.historicalAnalytics || []).filter(h => (h.userId || h.user_id) === userId).map(mapHistoricalAnalytics);
      },
      async getByDate(userId, date) {
        const store = await readJson(storePath, seedStorePath);
        return mapHistoricalAnalytics(store.historicalAnalytics?.find(h => (h.userId || h.user_id) === userId && h.date === date));
      },
      async create(row) {
        await perform("historicalAnalytics", (coll) => coll.push(row));
        return mapHistoricalAnalytics(row);
      },
      async update(id, updates) {
        return perform("historicalAnalytics", (coll) => {
          const h = coll.find(item => item.id === id);
          if (h) Object.assign(h, updates);
          return mapHistoricalAnalytics(h);
        });
      }
    },
    processedWebhookEvents: {
      async has(value) {
        const store = await readJson(storePath, seedStorePath);
        return store.processedWebhookEvents?.some(v => v === value || v.value === value) || false;
      },
      async create(value) {
        await perform("processedWebhookEvents", (coll) => coll.push(value));
      }
    },
    gmailSyncState: localGmailSyncState(storePath, seedStorePath, perform),
    workspaceAiUsage: localWorkspaceAiUsage(storePath, seedStorePath, perform),
    workflowRuns: localWorkflowRuns(storePath, seedStorePath, perform),
    approvalActions: localApprovalActions(storePath, seedStorePath, perform),
    auditLogs: localAuditLogs(storePath, seedStorePath, perform),
    notifications: localNotifications(storePath, seedStorePath, perform),
    withWorkspaceContext: async (workspaceId, callback) => {
      return callback();
    },
    transaction: async (workspaceId, fn) => {
      return fn(null);
    },
    close: async () => {}
  };
}

module.exports = {
  createLocalRepository
};
