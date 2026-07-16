const {
  mapTemplate,
  mapAuthToken,
  mapOutbox,
  mapHistoricalAnalytics
} = require("./mappers");

const { postgresUsers } = require("./users.repository");
const { postgresLeads } = require("./leads.repository");
const { postgresApprovals } = require("./approvals.repository");
const { postgresWorkflows } = require("./workflows.repository");
const { postgresIntegrations } = require("./integrations.repository");
const { postgresActivity } = require("./activity.repository");
const { postgresWorkspaceMembers } = require("./workspaceMembers.repository");
const { postgresGmailSyncState } = require("./gmailSyncState.repository");
const { postgresWorkspaceAiUsage } = require("./workspaceAiUsage.repository");
const { postgresWorkflowRuns } = require("./workflowRuns.repository");
const { postgresApprovalActions } = require("./approvalActions.repository");
const { postgresAuditLogs } = require("./auditLogs.repository");
const { postgresNotifications } = require("./notifications.repository");

function createPostgresRepository({ databaseUrl, seedStorePath }) {
  const postgres = require("postgres");
  const connectionUrl = new URL(databaseUrl);

  if (!connectionUrl.pathname || connectionUrl.pathname === "/") {
    connectionUrl.pathname = "/postgres";
  }

  const { AsyncLocalStorage } = require("async_hooks");
  const transactionStorage = new AsyncLocalStorage();
  const workspaceStorage = new AsyncLocalStorage();

  const sql = postgres(connectionUrl.toString(), {
    ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
    max: Number(process.env.DATABASE_POOL_SIZE || 15),
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: false
  });

  const db = (...args) => {
    const tx = transactionStorage.getStore();
    if (tx) return tx(...args);

    const workspaceId = workspaceStorage.getStore();
    if (workspaceId) {
      return sql.begin('read only', async (conn) => {
        await conn`SET LOCAL app.current_workspace_id = ${workspaceId}`;
        return conn(...args);
      });
    }

    return sql(...args);
  };

  let connectionVerified = false;
  async function ensureConnection() {
    if (connectionVerified) return;
    let lastError;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await sql`select 1 as connected`;
        connectionVerified = true;
        console.log("✅ PostgreSQL connection established");
        return;
      } catch (error) {
        lastError = error;
        console.error(`❌ PostgreSQL connection attempt ${attempt} failed:`, error.message);
        if (attempt < 5) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    throw lastError;
  }

  return {
    mode: "supabase_postgres",
    users: postgresUsers(db, ensureConnection),
    workspaceMembers: postgresWorkspaceMembers(db, ensureConnection),
    businesses: {
      async getByUserId(userId) {
        await ensureConnection();
        const rows = await db`SELECT * FROM public.businesses WHERE user_id = ${userId}`;
        const { mapBusiness } = require("./mappers");
        return rows.length ? mapBusiness(rows[0]) : null;
      },
      async create(b) {
        await ensureConnection();
        await sql`
          INSERT INTO public.businesses (
            id, user_id, name, type, tone, goals, created_at, updated_at
          ) VALUES (
            ${b.id}, ${b.userId}, ${b.name}, ${b.type || "other"}, ${b.tone || "professional"},
            ${b.goals || ["lead_follow_up"]}, ${b.createdAt || new Date().toISOString()}, ${b.updatedAt || new Date().toISOString()}
          )
        `;
        return b;
      },
      async updateByUserId(userId, updates) {
        await ensureConnection();
        const mapped = {};
        if (updates.name !== undefined) mapped.name = updates.name;
        if (updates.type !== undefined) mapped.type = updates.type;
        if (updates.tone !== undefined) mapped.tone = updates.tone;
        if (updates.goals !== undefined) mapped.goals = updates.goals;
        mapped.updated_at = updates.updatedAt || new Date().toISOString();

        const rows = await db`
          UPDATE public.businesses SET ${db(mapped)} WHERE user_id = ${userId} RETURNING *
        `;
        const { mapBusiness } = require("./mappers");
        return rows.length ? mapBusiness(rows[0]) : null;
      }
    },
    integrations: postgresIntegrations(db, ensureConnection),
    templates: {
      async list() {
        await ensureConnection();
        const rows = await db`SELECT * FROM public.workflow_templates`;
        return rows.map(mapTemplate);
      },
      async getById(id) {
        await ensureConnection();
        const rows = await db`SELECT * FROM public.workflow_templates WHERE id = ${id}`;
        return rows.length ? mapTemplate(rows[0]) : null;
      }
    },
    workflows: postgresWorkflows(db, ensureConnection),
    leads: postgresLeads(db, ensureConnection),
    approvals: postgresApprovals(db, ensureConnection),
    activity: postgresActivity(db, ensureConnection),
    authTokens: {
      async create(token) {
        if (token.userId) {
          await ensureConnection();
          const userRows = await sql`SELECT id FROM public.users WHERE id = ${token.userId}`;
          if (!userRows.length) {
            throw new Error(`Foreign key constraint violation: User with ID ${token.userId} does not exist in users table.`);
          }
        }
        await ensureConnection();
        const th = token.tokenHash || token.token;
        await db`
          INSERT INTO public.auth_tokens (
            id, user_id, kind, token_hash, expires_at, created_at, used_at
          ) VALUES (
            ${token.id}, ${token.userId || null}, ${token.kind}, ${th}, ${token.expiresAt}, ${token.createdAt || new Date().toISOString()}, ${token.usedAt || null}
          )
        `;
        return token;
      },
      async getByKindAndHash(kind, tokenHash) {
        await ensureConnection();
        const rows = await sql`SELECT * FROM public.auth_tokens WHERE kind = ${kind} AND token_hash = ${tokenHash}`;
        return rows.length ? mapAuthToken(rows[0]) : null;
      },
      async update(id, updates) {
        await ensureConnection();
        const mapped = {};
        if (updates.usedAt !== undefined) mapped.used_at = updates.usedAt;

        if (Object.keys(mapped).length === 0) return this.getById(id);

        const rows = await sql`
          UPDATE public.auth_tokens SET ${sql(mapped)} WHERE id = ${id} RETURNING *
        `;
        return rows.length ? mapAuthToken(rows[0]) : null;
      },
      async delete(id) {
        await ensureConnection();
        await sql`DELETE FROM public.auth_tokens WHERE id = ${id}`;
      },
      async deleteByUserIdAndKind(userId, kind) {
        await ensureConnection();
        await sql`DELETE FROM public.auth_tokens WHERE user_id = ${userId} AND kind = ${kind}`;
      },
      async consumeOauthState(token, kind) {
        await ensureConnection();
        const rows = await sql`
          DELETE FROM public.auth_tokens
          WHERE kind = ${kind} AND (token_hash = ${token} OR token_hash LIKE ${token + ":%"}) AND expires_at > NOW()
          RETURNING *
        `;
        return rows.length ? mapAuthToken(rows[0]) : null;
      }
    },
    outbox: {
      async create(o) {
        await ensureConnection();
        await db`
          INSERT INTO public.outbox (
            id, user_id, to_email, kind, status, link, created_at, sent_at
          ) VALUES (
            ${o.id}, ${o.userId}, ${o.toEmail || o.to}, ${o.kind}, ${o.status || "queued"},
            ${o.link || null}, ${o.createdAt || new Date().toISOString()}, ${o.sentAt || null}
          )
        `;
        return o;
      },
      async update(id, updates) {
        await ensureConnection();
        const mapped = {};
        if (updates.status !== undefined) mapped.status = updates.status;
        if (updates.sentAt !== undefined) mapped.sent_at = updates.sentAt;

        if (Object.keys(mapped).length === 0) return;

        const rows = await db`
          UPDATE public.outbox SET ${db(mapped)} WHERE id = ${id} RETURNING *
        `;
        return rows.length ? mapOutbox(rows[0]) : null;
      },
      async list() {
        await ensureConnection();
        const rows = await db`SELECT * FROM public.outbox ORDER BY created_at ASC`;
        return rows.map(mapOutbox);
      }
    },
    historicalAnalytics: {
      async listByUserId(userId) {
        await ensureConnection();
        const rows = await db`SELECT * FROM public.historical_analytics WHERE user_id = ${userId} ORDER BY date ASC`;
        return rows.map(mapHistoricalAnalytics);
      },
      async getByDate(userId, date) {
        await ensureConnection();
        const rows = await db`SELECT * FROM public.historical_analytics WHERE user_id = ${userId} AND date = ${date}`;
        return rows.length ? mapHistoricalAnalytics(rows[0]) : null;
      },
      async create(h) {
        await ensureConnection();
        await db`
          INSERT INTO public.historical_analytics (
            id, user_id, date, leads_count, approvals_count, rejections_count, avg_response_time_seconds, time_saved_minutes, created_at
          ) VALUES (
            ${h.id}, ${h.userId}, ${h.date}, ${h.leadsCount || 0}, ${h.approvalsCount || 0}, ${h.rejectionsCount || 0},
            ${h.avgResponseTimeSeconds || 0}, ${h.timeSavedMinutes || 0}, ${h.createdAt || new Date().toISOString()}
          )
        `;
        return h;
      },
      async update(id, updates) {
        await ensureConnection();
        const mapped = {};
        if (updates.leadsCount !== undefined) mapped.leads_count = updates.leadsCount;
        if (updates.approvalsCount !== undefined) mapped.approvals_count = updates.approvalsCount;
        if (updates.rejectionsCount !== undefined) mapped.rejections_count = updates.rejectionsCount;
        if (updates.avg_response_time_seconds !== undefined) mapped.avg_response_time_seconds = updates.avg_response_time_seconds;
        if (updates.time_saved_minutes !== undefined) mapped.time_saved_minutes = updates.time_saved_minutes;

        if (Object.keys(mapped).length === 0) return;

        const rows = await db`
          UPDATE public.historical_analytics SET ${db(mapped)} WHERE id = ${id} RETURNING *
        `;
        return rows.length ? mapHistoricalAnalytics(rows[0]) : null;
      }
    },
    processedWebhookEvents: {
      async has(value) {
        await ensureConnection();
        const rows = await db`SELECT 1 FROM public.processed_webhook_events WHERE value = ${value}`;
        return rows.length > 0;
      },
      async create(value) {
        await ensureConnection();
        await db`INSERT INTO public.processed_webhook_events (value, processed_at) VALUES (${value}, NOW()) ON CONFLICT (value) DO NOTHING`;
      }
    },
    gmailSyncState: postgresGmailSyncState(db, ensureConnection),
    workspaceAiUsage: postgresWorkspaceAiUsage(db, ensureConnection),
    workflowRuns: postgresWorkflowRuns(db, ensureConnection),
    approvalActions: postgresApprovalActions(db, ensureConnection),
    auditLogs: postgresAuditLogs(db, ensureConnection),
    notifications: postgresNotifications(db, ensureConnection),
    withWorkspaceContext: async (workspaceId, callback) => {
      if (!workspaceId) throw new Error("Workspace context required");
      await ensureConnection();
      const current = workspaceStorage.getStore();
      if (current === workspaceId) {
        return callback();
      }
      return workspaceStorage.run(workspaceId, callback);
    },
    transaction: async (workspaceId, fn) => {
      if (!workspaceId) throw new Error("Workspace context required");
      await ensureConnection();
      return sql.begin(async (tx) => {
        await tx`SET LOCAL app.current_workspace_id = ${workspaceId}`;
        return transactionStorage.run(tx, () => fn(tx));
      });
    },
    close: async () => {
      await sql.end();
    }
  };
}

module.exports = {
  createPostgresRepository
};
