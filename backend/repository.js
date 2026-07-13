const fs = require("fs");

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

// Mapping helper functions
function mapUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    passwordHash: u.password_hash || u.passwordHash,
    emailVerified: u.email_verified !== undefined ? u.email_verified : u.emailVerified,
    googleId: u.google_id || u.googleId,
    plan: u.plan,
    billing: u.billing,
    createdAt: u.created_at ? new Date(u.created_at).toISOString() : (u.createdAt ? new Date(u.createdAt).toISOString() : null),
    emailVerifiedAt: u.email_verified_at ? new Date(u.email_verified_at).toISOString() : (u.emailVerifiedAt ? new Date(u.emailVerifiedAt).toISOString() : null),
    passwordChangedAt: u.password_changed_at ? new Date(u.password_changed_at).toISOString() : (u.passwordChangedAt ? new Date(u.passwordChangedAt).toISOString() : null)
  };
}

function mapBusiness(b) {
  if (!b) return null;
  return {
    id: b.id,
    userId: b.user_id || b.userId,
    name: b.name,
    type: b.type,
    tone: b.tone,
    goals: b.goals || [],
    createdAt: b.created_at ? new Date(b.created_at).toISOString() : (b.createdAt ? new Date(b.createdAt).toISOString() : null),
    updatedAt: b.updated_at ? new Date(b.updated_at).toISOString() : (b.updatedAt ? new Date(b.updatedAt).toISOString() : null)
  };
}

function mapIntegration(i) {
  if (!i) return null;
  return {
    id: i.id,
    userId: i.user_id || i.userId,
    provider: i.provider,
    status: i.status,
    encryptedCredentials: i.encrypted_credentials || i.encryptedCredentials,
    connectedEmail: i.connected_email || i.connectedEmail,
    lastSyncedAt: i.last_synced_at ? new Date(i.last_synced_at).toISOString() : (i.lastSyncedAt ? new Date(i.lastSyncedAt).toISOString() : null),
    createdAt: i.created_at ? new Date(i.created_at).toISOString() : (i.createdAt ? new Date(i.createdAt).toISOString() : null),
    updatedAt: i.updated_at ? new Date(i.updated_at).toISOString() : (i.updatedAt ? new Date(i.updatedAt).toISOString() : null)
  };
}

function mapTemplate(t) {
  if (!t) return null;
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    recommended: t.recommended || false,
    triggerKey: t.trigger_key || t.triggerKey,
    actions: t.actions || []
  };
}

function mapWorkflow(w) {
  if (!w) return null;
  return {
    id: w.id,
    userId: w.user_id || w.userId,
    templateId: w.template_id || w.templateId,
    name: w.name,
    status: w.status,
    triggerKey: w.trigger_key || w.triggerKey,
    actions: w.actions || [],
    runs: w.runs || 0,
    createdAt: w.created_at ? new Date(w.created_at).toISOString() : (w.createdAt ? new Date(w.createdAt).toISOString() : null),
    updatedAt: w.updated_at ? new Date(w.updated_at).toISOString() : (w.updatedAt ? new Date(w.updatedAt).toISOString() : null)
  };
}

function mapLead(l) {
  if (!l) return null;
  return {
    id: l.id,
    userId: l.user_id || l.userId,
    name: l.name,
    email: l.email,
    phone: l.phone,
    message: l.message,
    source: l.source,
    status: l.status,
    gmailMessageId: l.gmail_message_id || l.gmailMessageId || null,
    createdAt: l.created_at ? new Date(l.created_at).toISOString() : (l.createdAt ? new Date(l.createdAt).toISOString() : null)
  };
}

function mapApproval(a) {
  if (!a) return null;
  return {
    id: a.id,
    userId: a.user_id || a.userId,
    leadId: a.lead_id || a.leadId,
    status: a.status,
    kind: a.kind,
    draft: a.draft,
    aiProvider: a.ai_provider || a.aiProvider,
    deliveryProvider: a.delivery_provider || a.deliveryProvider,
    createdAt: a.created_at ? new Date(a.created_at).toISOString() : (a.createdAt ? new Date(a.createdAt).toISOString() : null),
    resolvedAt: a.resolved_at ? new Date(a.resolved_at).toISOString() : (a.resolvedAt ? new Date(a.resolvedAt).toISOString() : null)
  };
}

function mapActivity(ac) {
  if (!ac) return null;
  return {
    id: ac.id,
    userId: ac.user_id || ac.userId,
    type: ac.type,
    label: ac.label,
    source: ac.source,
    status: ac.status,
    createdAt: ac.created_at ? new Date(ac.created_at).toISOString() : (ac.createdAt ? new Date(ac.createdAt).toISOString() : null)
  };
}

function mapAuthToken(at) {
  if (!at) return null;
  return {
    id: at.id,
    userId: at.user_id || at.userId,
    kind: at.kind,
    tokenHash: at.token_hash || at.tokenHash || at.token,
    token: at.token,
    expiresAt: at.expires_at ? new Date(at.expires_at).toISOString() : (at.expiresAt ? new Date(at.expiresAt).toISOString() : null),
    createdAt: at.created_at ? new Date(at.created_at).toISOString() : (at.createdAt ? new Date(at.createdAt).toISOString() : null),
    usedAt: at.used_at ? new Date(at.used_at).toISOString() : (at.usedAt ? new Date(at.usedAt).toISOString() : null)
  };
}

function mapOutbox(o) {
  if (!o) return null;
  return {
    id: o.id,
    userId: o.user_id || o.userId,
    toEmail: o.to_email || o.toEmail || o.to,
    to: o.to || o.to_email || o.toEmail,
    kind: o.kind,
    status: o.status,
    link: o.link,
    createdAt: o.created_at ? new Date(o.created_at).toISOString() : (o.createdAt ? new Date(o.createdAt).toISOString() : null),
    sentAt: o.sent_at ? new Date(o.sent_at).toISOString() : (o.sentAt ? new Date(o.sentAt).toISOString() : null)
  };
}

function mapHistoricalAnalytics(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id || row.userId,
    date: row.date ? new Date(row.date).toISOString().split('T')[0] : null,
    leadsCount: Number(row.leads_count !== undefined ? row.leads_count : (row.leadsCount !== undefined ? row.leadsCount : 0)),
    approvalsCount: Number(row.approvals_count !== undefined ? row.approvals_count : (row.approvalsCount !== undefined ? row.approvalsCount : 0)),
    rejectionsCount: Number(row.rejections_count !== undefined ? row.rejections_count : (row.rejectionsCount !== undefined ? row.rejectionsCount : 0)),
    avgResponseTimeSeconds: Number(row.avg_response_time_seconds !== undefined ? row.avg_response_time_seconds : (row.avgResponseTimeSeconds !== undefined ? row.avgResponseTimeSeconds : 0)),
    timeSavedMinutes: Number(row.time_saved_minutes !== undefined ? row.time_saved_minutes : (row.timeSavedMinutes !== undefined ? row.timeSavedMinutes : 0)),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : (row.createdAt ? new Date(row.createdAt).toISOString() : null)
  };
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
    users: {
      async getById(id) {
        const store = await readJson(storePath, seedStorePath);
        return mapUser(store.users?.find(u => u.id === id));
      },
      async getByEmail(email) {
        const store = await readJson(storePath, seedStorePath);
        return mapUser(store.users?.find(u => u.email?.toLowerCase() === email?.toLowerCase()));
      },
      async create(user) {
        await perform("users", (coll) => coll.push(user));
        return user;
      },
      async update(id, updates) {
        return perform("users", (coll) => {
          const u = coll.find(item => item.id === id);
          if (u) Object.assign(u, updates);
          return mapUser(u);
        });
      },
      async delete(id) {
        return perform("users", (coll, store) => {
          const idx = coll.findIndex(item => item.id === id);
          if (idx !== -1) coll.splice(idx, 1);
          ["businesses", "integrations", "workflows", "leads", "activity", "approvals", "authTokens", "outbox", "historicalAnalytics"].forEach(col => {
            if (Array.isArray(store[col])) {
              store[col] = store[col].filter(item => (item.userId || item.user_id) !== id);
            }
          });
        });
      },
      async list() {
        const store = await readJson(storePath, seedStorePath);
        return (store.users || []).map(mapUser);
      }
    },
    businesses: {
      async getByUserId(userId) {
        const store = await readJson(storePath, seedStorePath);
        return mapBusiness(store.businesses?.find(b => (b.userId || b.user_id) === userId));
      },
      async create(business) {
        await perform("businesses", (coll) => coll.push(business));
        return business;
      },
      async updateByUserId(userId, updates) {
        return perform("businesses", (coll) => {
          const b = coll.find(item => (item.userId || item.user_id) === userId);
          if (b) Object.assign(b, updates);
          return mapBusiness(b);
        });
      }
    },
    integrations: {
      async getByUserIdAndProvider(userId, provider) {
        const store = await readJson(storePath, seedStorePath);
        return mapIntegration(store.integrations?.find(i => (i.userId || i.user_id) === userId && i.provider === provider));
      },
      async listConnectedGmail() {
        const store = await readJson(storePath, seedStorePath);
        return (store.integrations || []).filter(i => i.provider === "gmail" && i.status === "connected" && (i.encryptedCredentials || i.encrypted_credentials)).map(mapIntegration);
      },
      async listByUserId(userId) {
        const store = await readJson(storePath, seedStorePath);
        return (store.integrations || []).filter(i => (i.userId || i.user_id) === userId).map(mapIntegration);
      },
      async create(integration) {
        await perform("integrations", (coll) => coll.push(integration));
        return integration;
      },
      async upsert(userId, provider, values) {
        return perform("integrations", (coll) => {
          let i = coll.find(item => (item.userId || item.user_id) === userId && item.provider === provider);
          if (!i) {
            const { id } = require("./src/utils/helpers");
            i = { id: id("int"), userId, provider, createdAt: new Date().toISOString() };
            coll.push(i);
          }
          Object.assign(i, values, { updatedAt: new Date().toISOString() });
          return mapIntegration(i);
        });
      },
      async updateLastSyncedAt(userId, timestamp) {
        return perform("integrations", (coll) => {
          const i = coll.find(item => (item.userId || item.user_id) === userId && item.provider === "gmail");
          if (i) {
            i.lastSyncedAt = timestamp;
            i.last_synced_at = timestamp;
            i.updatedAt = timestamp;
          }
          return mapIntegration(i);
        });
      },
      async delete(id) {
        return perform("integrations", (coll) => {
          const idx = coll.findIndex(item => item.id === id);
          if (idx !== -1) coll.splice(idx, 1);
        });
      }
    },
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
    workflows: {
      async listByUserId(userId) {
        const store = await readJson(storePath, seedStorePath);
        return (store.workflows || []).filter(w => (w.userId || w.user_id) === userId).map(mapWorkflow);
      },
      async getById(id) {
        const store = await readJson(storePath, seedStorePath);
        return mapWorkflow(store.workflows?.find(w => w.id === id));
      },
      async create(workflow) {
        await perform("workflows", (coll) => coll.push(workflow));
        return workflow;
      },
      async update(id, updates) {
        return perform("workflows", (coll) => {
          const w = coll.find(item => item.id === id);
          if (w) Object.assign(w, updates);
          return mapWorkflow(w);
        });
      },
      async incrementRuns(id) {
        return perform("workflows", (coll) => {
          const w = coll.find(item => item.id === id);
          if (w) w.runs = (w.runs || 0) + 1;
          return mapWorkflow(w);
        });
      },
      async delete(id) {
        return perform("workflows", (coll) => {
          const idx = coll.findIndex(item => item.id === id);
          if (idx !== -1) coll.splice(idx, 1);
        });
      }
    },
    leads: {
      async listByUserId(userId) {
        const store = await readJson(storePath, seedStorePath);
        return (store.leads || []).filter(l => (l.userId || l.user_id) === userId).map(mapLead);
      },
      async getById(id) {
        const store = await readJson(storePath, seedStorePath);
        return mapLead(store.leads?.find(l => l.id === id));
      },
      async create(lead) {
        await perform("leads", (coll) => coll.push(lead));
        return lead;
      },
      async update(id, updates) {
        return perform("leads", (coll) => {
          const l = coll.find(item => item.id === id);
          if (l) Object.assign(l, updates);
          return mapLead(l);
        });
      },
      async getByGmailMessageId(userId, gmailMessageId) {
        const store = await readJson(storePath, seedStorePath);
        return mapLead(store.leads?.find(l => (l.userId || l.user_id) === userId && (l.gmailMessageId || l.gmail_message_id) === gmailMessageId));
      }
    },
    approvals: {
      async listByUserId(userId) {
        const store = await readJson(storePath, seedStorePath);
        return (store.approvals || []).filter(a => (a.userId || a.user_id) === userId).map(mapApproval);
      },
      async getById(id) {
        const store = await readJson(storePath, seedStorePath);
        return mapApproval(store.approvals?.find(a => a.id === id));
      },
      async getByLeadId(leadId) {
        const store = await readJson(storePath, seedStorePath);
        return mapApproval(store.approvals?.find(a => (a.leadId || a.lead_id) === leadId));
      },
      async create(approval) {
        await perform("approvals", (coll) => coll.push(approval));
        return approval;
      },
      async update(id, updates) {
        return perform("approvals", (coll) => {
          const a = coll.find(item => item.id === id);
          if (a) Object.assign(a, updates);
          return mapApproval(a);
        });
      }
    },
    activity: {
      async listByUserId(userId) {
        const store = await readJson(storePath, seedStorePath);
        return (store.activity || []).filter(ac => (ac.userId || ac.user_id) === userId).map(mapActivity);
      },
      async create(act) {
        const { id, now } = require("./src/utils/helpers");
        const row = { id: id("act"), createdAt: now(), status: "success", ...act };
        await perform("activity", (coll) => coll.unshift(row));
        return mapActivity(row);
      }
    },
    authTokens: {
      async create(token) {
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
      async consumeOauthState(token, kind) {
        return runLocked(async () => {
          const store = await readJson(storePath, seedStorePath);
          const idx = store.authTokens?.findIndex(t => t.kind === kind && (t.token === token || t.tokenHash === token || t.token_hash === token) && new Date(t.expiresAt || t.expires_at) > new Date()) ?? -1;
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
    close: async () => {}
  };
}

function createPostgresRepository({ databaseUrl, seedStorePath }) {
  const postgres = require("postgres");
  const connectionUrl = new URL(databaseUrl);

  if (!connectionUrl.pathname || connectionUrl.pathname === "/") {
    connectionUrl.pathname = "/postgres";
  }

  const sql = postgres(connectionUrl.toString(), {
    ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
    max: Number(process.env.DATABASE_POOL_SIZE || 5),
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false
  });

  let connectionVerified = false;
  async function ensureConnection() {
    if (connectionVerified) return;
    try {
      await sql`select 1 as connected`;
      connectionVerified = true;
      console.log("✅ PostgreSQL connection established");
    } catch (error) {
      console.error("❌ PostgreSQL connection failed:", error.message);
      throw error;
    }
  }

  return {
    mode: "supabase_postgres",
    users: {
      async getById(id) {
        await ensureConnection();
        const rows = await sql`SELECT * FROM public.users WHERE id = ${id}`;
        return rows.length ? mapUser(rows[0]) : null;
      },
      async getByEmail(email) {
        await ensureConnection();
        const rows = await sql`SELECT * FROM public.users WHERE LOWER(email) = ${email.toLowerCase()}`;
        return rows.length ? mapUser(rows[0]) : null;
      },
      async create(user) {
        await ensureConnection();
        await sql`
          INSERT INTO public.users (
            id, name, email, password_hash, email_verified, google_id, plan, billing, created_at, email_verified_at, password_changed_at
          ) VALUES (
            ${user.id}, ${user.name}, ${user.email}, ${user.passwordHash || null}, ${user.emailVerified || false},
            ${user.googleId || null}, ${user.plan || "free"}, ${user.billing ? sql.json(user.billing) : null},
            ${user.createdAt || new Date().toISOString()}, ${user.emailVerifiedAt || null}, ${user.passwordChangedAt || null}
          )
        `;
        return user;
      },
      async update(id, updates) {
        await ensureConnection();
        const mapped = {};
        if (updates.name !== undefined) mapped.name = updates.name;
        if (updates.email !== undefined) mapped.email = updates.email;
        if (updates.passwordHash !== undefined) mapped.password_hash = updates.passwordHash;
        if (updates.emailVerified !== undefined) mapped.email_verified = updates.emailVerified;
        if (updates.googleId !== undefined) mapped.google_id = updates.googleId;
        if (updates.plan !== undefined) mapped.plan = updates.plan;
        if (updates.billing !== undefined) mapped.billing = updates.billing ? sql.json(updates.billing) : null;
        if (updates.emailVerifiedAt !== undefined) mapped.email_verified_at = updates.emailVerifiedAt;
        if (updates.passwordChangedAt !== undefined) mapped.password_changed_at = updates.passwordChangedAt;

        if (Object.keys(mapped).length === 0) return this.getById(id);

        const rows = await sql`
          UPDATE public.users SET ${sql(mapped)} WHERE id = ${id} RETURNING *
        `;
        return rows.length ? mapUser(rows[0]) : null;
      },
      async delete(id) {
        await ensureConnection();
        await sql`DELETE FROM public.users WHERE id = ${id}`;
      },
      async list() {
        await ensureConnection();
        const rows = await sql`SELECT * FROM public.users ORDER BY created_at ASC`;
        return rows.map(mapUser);
      }
    },
    businesses: {
      async getByUserId(userId) {
        await ensureConnection();
        const rows = await sql`SELECT * FROM public.businesses WHERE user_id = ${userId}`;
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

        const rows = await sql`
          UPDATE public.businesses SET ${sql(mapped)} WHERE user_id = ${userId} RETURNING *
        `;
        return rows.length ? mapBusiness(rows[0]) : null;
      }
    },
    integrations: {
      async getByUserIdAndProvider(userId, provider) {
        await ensureConnection();
        const rows = await sql`SELECT * FROM public.integrations WHERE user_id = ${userId} AND provider = ${provider}`;
        return rows.length ? mapIntegration(rows[0]) : null;
      },
      async listConnectedGmail() {
        await ensureConnection();
        const rows = await sql`SELECT * FROM public.integrations WHERE provider = 'gmail' AND status = 'connected' AND encrypted_credentials IS NOT NULL`;
        return rows.map(mapIntegration);
      },
      async listByUserId(userId) {
        await ensureConnection();
        const rows = await sql`SELECT * FROM public.integrations WHERE user_id = ${userId}`;
        return rows.map(mapIntegration);
      },
      async create(i) {
        await ensureConnection();
        await sql`
          INSERT INTO public.integrations (
            id, user_id, provider, status, encrypted_credentials, connected_email, created_at, updated_at
          ) VALUES (
            ${i.id}, ${i.userId}, ${i.provider}, ${i.status || "connected"},
            ${i.encryptedCredentials || null}, ${i.connectedEmail || null}, ${i.createdAt || new Date().toISOString()}, ${i.updatedAt || new Date().toISOString()}
          )
        `;
        return i;
      },
      async upsert(userId, provider, values) {
        await ensureConnection();
        const existing = await this.getByUserIdAndProvider(userId, provider);
        if (existing) {
          const mapped = {
            status: values.status !== undefined ? values.status : existing.status,
            encrypted_credentials: values.encryptedCredentials !== undefined ? values.encryptedCredentials : existing.encryptedCredentials,
            connected_email: values.connectedEmail !== undefined ? values.connectedEmail : existing.connectedEmail,
            updated_at: new Date().toISOString()
          };
          const rows = await sql`
            UPDATE public.integrations SET ${sql(mapped)} WHERE id = ${existing.id} RETURNING *
          `;
          return mapIntegration(rows[0]);
        } else {
          const { id } = require("./src/utils/helpers");
          const i = {
            id: id("int"),
            userId,
            provider,
            status: values.status || "connected",
            encryptedCredentials: values.encryptedCredentials || null,
            connectedEmail: values.connectedEmail || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await this.create(i);
          return i;
        }
      },
      async updateLastSyncedAt(userId, timestamp) {
        await ensureConnection();
        const rows = await sql`
          UPDATE public.integrations SET last_synced_at = ${timestamp}, updated_at = ${timestamp}
          WHERE user_id = ${userId} AND provider = 'gmail' RETURNING *
        `;
        return rows.length ? mapIntegration(rows[0]) : null;
      },
      async delete(id) {
        await ensureConnection();
        await sql`DELETE FROM public.integrations WHERE id = ${id}`;
      }
    },
    templates: {
      async list() {
        await ensureConnection();
        const rows = await sql`SELECT * FROM public.workflow_templates`;
        return rows.map(mapTemplate);
      },
      async getById(id) {
        await ensureConnection();
        const rows = await sql`SELECT * FROM public.workflow_templates WHERE id = ${id}`;
        return rows.length ? mapTemplate(rows[0]) : null;
      }
    },
    workflows: {
      async listByUserId(userId) {
        await ensureConnection();
        const rows = await sql`SELECT * FROM public.workflows WHERE user_id = ${userId} ORDER BY created_at ASC`;
        return rows.map(mapWorkflow);
      },
      async getById(id) {
        await ensureConnection();
        const rows = await sql`SELECT * FROM public.workflows WHERE id = ${id}`;
        return rows.length ? mapWorkflow(rows[0]) : null;
      },
      async create(w) {
        await ensureConnection();
        await sql`
          INSERT INTO public.workflows (
            id, user_id, template_id, name, status, trigger_key, actions, runs, created_at, updated_at
          ) VALUES (
            ${w.id}, ${w.userId}, ${w.templateId || null}, ${w.name}, ${w.status || "active"},
            ${w.triggerKey || w.trigger || "lead.created"}, ${w.actions ? sql.json(w.actions) : "[]"}::jsonb, ${w.runs || 0},
            ${w.createdAt || new Date().toISOString()}, ${w.updatedAt || new Date().toISOString()}
          )
        `;
        return w;
      },
      async update(id, updates) {
        await ensureConnection();
        const mapped = {};
        if (updates.status !== undefined) mapped.status = updates.status;
        if (updates.runs !== undefined) mapped.runs = updates.runs;
        mapped.updated_at = updates.updatedAt || new Date().toISOString();

        const rows = await sql`
          UPDATE public.workflows SET ${sql(mapped)} WHERE id = ${id} RETURNING *
        `;
        return rows.length ? mapWorkflow(rows[0]) : null;
      },
      async incrementRuns(id) {
        await ensureConnection();
        const rows = await sql`
          UPDATE public.workflows SET runs = COALESCE(runs, 0) + 1, updated_at = NOW() WHERE id = ${id} RETURNING *
        `;
        return rows.length ? mapWorkflow(rows[0]) : null;
      },
      async delete(id) {
        await ensureConnection();
        await sql`DELETE FROM public.workflows WHERE id = ${id}`;
      }
    },
    leads: {
      async listByUserId(userId) {
        await ensureConnection();
        const rows = await sql`SELECT * FROM public.leads WHERE user_id = ${userId} ORDER BY created_at ASC`;
        return rows.map(mapLead);
      },
      async getById(id) {
        await ensureConnection();
        const rows = await sql`SELECT * FROM public.leads WHERE id = ${id}`;
        return rows.length ? mapLead(rows[0]) : null;
      },
      async create(l) {
        await ensureConnection();
        await sql`
          INSERT INTO public.leads (
            id, user_id, name, email, phone, message, source, status, gmail_message_id, created_at
          ) VALUES (
            ${l.id}, ${l.userId}, ${l.name}, ${l.email || null}, ${l.phone || null},
            ${l.message || ""}, ${l.source || "manual"}, ${l.status || "new"}, ${l.gmailMessageId || null},
            ${l.createdAt || new Date().toISOString()}
          )
        `;
        return l;
      },
      async update(id, updates) {
        await ensureConnection();
        const mapped = {};
        if (updates.status !== undefined) mapped.status = updates.status;

        if (Object.keys(mapped).length === 0) return this.getById(id);

        const rows = await sql`
          UPDATE public.leads SET ${sql(mapped)} WHERE id = ${id} RETURNING *
        `;
        return rows.length ? mapLead(rows[0]) : null;
      },
      async getByGmailMessageId(userId, gmailMessageId) {
        await ensureConnection();
        const rows = await sql`SELECT * FROM public.leads WHERE user_id = ${userId} AND gmail_message_id = ${gmailMessageId}`;
        return rows.length ? mapLead(rows[0]) : null;
      }
    },
    approvals: {
      async listByUserId(userId) {
        await ensureConnection();
        const rows = await sql`SELECT * FROM public.approvals WHERE user_id = ${userId} ORDER BY created_at ASC`;
        return rows.map(mapApproval);
      },
      async getById(id) {
        await ensureConnection();
        const rows = await sql`SELECT * FROM public.approvals WHERE id = ${id}`;
        return rows.length ? mapApproval(rows[0]) : null;
      },
      async getByLeadId(leadId) {
        await ensureConnection();
        const rows = await sql`SELECT * FROM public.approvals WHERE lead_id = ${leadId}`;
        return rows.length ? mapApproval(rows[0]) : null;
      },
      async create(a) {
        await ensureConnection();
        await sql`
          INSERT INTO public.approvals (
            id, user_id, lead_id, status, kind, draft, ai_provider, delivery_provider, created_at, resolved_at
          ) VALUES (
            ${a.id}, ${a.userId}, ${a.leadId}, ${a.status || "pending"}, ${a.kind || "follow_up_draft"},
            ${a.draft || null}, ${a.aiProvider || null}, ${a.deliveryProvider || null},
            ${a.createdAt || new Date().toISOString()}, ${a.resolvedAt || null}
          )
        `;
        return a;
      },
      async update(id, updates) {
        await ensureConnection();
        const mapped = {};
        if (updates.draft !== undefined) mapped.draft = updates.draft;
        if (updates.status !== undefined) mapped.status = updates.status;
        if (updates.deliveryProvider !== undefined) mapped.delivery_provider = updates.deliveryProvider;
        if (updates.resolvedAt !== undefined) mapped.resolved_at = updates.resolvedAt;

        if (Object.keys(mapped).length === 0) return this.getById(id);

        const rows = await sql`
          UPDATE public.approvals SET ${sql(mapped)} WHERE id = ${id} RETURNING *
        `;
        return rows.length ? mapApproval(rows[0]) : null;
      }
    },
    activity: {
      async listByUserId(userId) {
        await ensureConnection();
        const rows = await sql`SELECT * FROM public.activity_logs WHERE user_id = ${userId} ORDER BY created_at DESC`;
        return rows.map(mapActivity);
      },
      async create(act) {
        await ensureConnection();
        const { id, now } = require("./src/utils/helpers");
        const actId = act.id || id("act");
        const createdAt = act.createdAt || now();
        await sql`
          INSERT INTO public.activity_logs (
            id, user_id, type, label, source, status, created_at
          ) VALUES (
            ${actId}, ${act.userId}, ${act.type}, ${act.label}, ${act.source || "system"}, ${act.status || "success"}, ${createdAt}
          )
        `;
        return { id: actId, createdAt, status: act.status || "success", ...act };
      }
    },
    authTokens: {
      async create(token) {
        await ensureConnection();
        const th = token.tokenHash || token.token;
        await sql`
          INSERT INTO public.auth_tokens (
            id, user_id, kind, token_hash, expires_at, created_at, used_at
          ) VALUES (
            ${token.id}, ${token.userId}, ${token.kind}, ${th}, ${token.expiresAt}, ${token.createdAt || new Date().toISOString()}, ${token.usedAt || null}
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
      async consumeOauthState(token, kind) {
        await ensureConnection();
        const rows = await sql`
          DELETE FROM public.auth_tokens
          WHERE kind = ${kind} AND token_hash = ${token} AND expires_at > NOW()
          RETURNING *
        `;
        return rows.length ? mapAuthToken(rows[0]) : null;
      }
    },
    outbox: {
      async create(o) {
        await ensureConnection();
        await sql`
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

        const rows = await sql`
          UPDATE public.outbox SET ${sql(mapped)} WHERE id = ${id} RETURNING *
        `;
        return rows.length ? mapOutbox(rows[0]) : null;
      },
      async list() {
        await ensureConnection();
        const rows = await sql`SELECT * FROM public.outbox ORDER BY created_at ASC`;
        return rows.map(mapOutbox);
      }
    },
    historicalAnalytics: {
      async listByUserId(userId) {
        await ensureConnection();
        const rows = await sql`SELECT * FROM public.historical_analytics WHERE user_id = ${userId} ORDER BY date ASC`;
        return rows.map(mapHistoricalAnalytics);
      },
      async getByDate(userId, date) {
        await ensureConnection();
        const rows = await sql`SELECT * FROM public.historical_analytics WHERE user_id = ${userId} AND date = ${date}`;
        return rows.length ? mapHistoricalAnalytics(rows[0]) : null;
      },
      async create(h) {
        await ensureConnection();
        await sql`
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
        if (updates.avgResponseTimeSeconds !== undefined) mapped.avg_response_time_seconds = updates.avgResponseTimeSeconds;
        if (updates.timeSavedMinutes !== undefined) mapped.time_saved_minutes = updates.timeSavedMinutes;

        if (Object.keys(mapped).length === 0) return;

        const rows = await sql`
          UPDATE public.historical_analytics SET ${sql(mapped)} WHERE id = ${id} RETURNING *
        `;
        return rows.length ? mapHistoricalAnalytics(rows[0]) : null;
      }
    },
    processedWebhookEvents: {
      async has(value) {
        await ensureConnection();
        const rows = await sql`SELECT 1 FROM public.processed_webhook_events WHERE value = ${value}`;
        return rows.length > 0;
      },
      async create(value) {
        await ensureConnection();
        await sql`INSERT INTO public.processed_webhook_events (value, processed_at) VALUES (${value}, NOW()) ON CONFLICT (value) DO NOTHING`;
      }
    },
    close: async () => {
      await sql.end();
    }
  };
}

function createRepository({ seedStorePath, storePath }) {
  if (process.env.DATABASE_URL) {
    return createPostgresRepository({
      databaseUrl: process.env.DATABASE_URL,
      seedStorePath
    });
  }

  return createLocalRepository({
    seedStorePath,
    storePath
  });
}

module.exports = {
  createRepository,
};