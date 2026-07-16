const { mapIntegration } = require("./mappers");

const localIntegrations = (storePath, seedStorePath, perform) => ({
  async getByWorkspaceAndProvider(workspaceId, provider) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!provider) {
      provider = workspaceId;
      workspaceId = null;
    }
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    return mapIntegration(store.integrations?.find(i => (i.workspaceId || i.workspace_id) === workspaceId && i.provider === provider));
  },
  async getByWorkspaceAndProviderForUpdate(workspaceId, provider) {
    return this.getByWorkspaceAndProvider(workspaceId, provider);
  },
  async listConnectedGmail() {
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    return (store.integrations || []).filter(i => i.provider === "gmail" && i.status === "connected" && (i.encryptedCredentials || i.encrypted_credentials)).map(mapIntegration);
  },
  async listByWorkspaceId(workspaceId) {
    if (!workspaceId) throw new Error("Workspace context required");
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    return (store.integrations || []).filter(i => (i.workspaceId || i.workspace_id) === workspaceId).map(mapIntegration);
  },
  async create(workspaceId, integration) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!integration) {
      integration = workspaceId;
      workspaceId = integration.workspaceId || integration.workspace_id;
      if (!workspaceId) throw new Error("Workspace context required");
    }
    await perform("integrations", (coll) => coll.push({ ...integration, workspaceId, workspace_id: workspaceId }));
    return integration;
  },
  async upsert(workspaceId, provider, values) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!values) {
      values = provider;
      provider = workspaceId;
      workspaceId = values.workspaceId || values.workspace_id;
      if (!workspaceId) throw new Error("Workspace context required");
    }
    return perform("integrations", (coll) => {
      let i = coll.find(item => (item.workspaceId || item.workspace_id) === workspaceId && item.provider === provider);
      if (!i) {
        const { id } = require("../utils/helpers");
        i = { id: id("int"), workspaceId, workspace_id: workspaceId, provider, createdAt: new Date().toISOString() };
        coll.push(i);
      }
      Object.assign(i, values, { updatedAt: new Date().toISOString() });
      return mapIntegration(i);
    });
  },
  async updateLastSyncedAt(workspaceId, timestamp) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!timestamp) {
      timestamp = workspaceId;
      workspaceId = null;
    }
    return perform("integrations", (coll) => {
      const i = coll.find(item => (item.workspaceId || item.workspace_id) === workspaceId && item.provider === "gmail");
      if (i) {
        i.lastSyncedAt = timestamp;
        i.last_synced_at = timestamp;
        i.updatedAt = timestamp;
      }
      return mapIntegration(i);
    });
  },
  async delete(workspaceId, id) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!id) {
      id = workspaceId;
      workspaceId = null;
    }
    return perform("integrations", (coll) => {
      const idx = coll.findIndex(item => item.id === id && (item.workspaceId || item.workspace_id) === workspaceId);
      if (idx !== -1) coll.splice(idx, 1);
    });
  },

  // Legacy compatibility signatures
  async getByUserIdAndProvider(userId, provider) {
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    const business = store.businesses?.find(b => b.userId === userId || b.user_id === userId);
    const workspaceId = business ? business.id : "biz_mock";
    return mapIntegration(store.integrations?.find(i => (i.workspaceId || i.workspace_id) === workspaceId && i.provider === provider));
  },
  async getByUserIdAndProviderForUpdate(userId, provider) {
    return this.getByUserIdAndProvider(userId, provider);
  },
  async listByUserId(userId) {
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    const business = store.businesses?.find(b => b.userId === userId || b.user_id === userId);
    const workspaceId = business ? business.id : "biz_mock";
    return (store.integrations || []).filter(i => (i.workspaceId || i.workspace_id) === workspaceId).map(mapIntegration);
  }
});

const postgresIntegrations = (sql, ensureConnection) => ({
  async getByWorkspaceAndProvider(workspaceId, provider) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!provider) {
      provider = workspaceId;
      workspaceId = null;
    }
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.integrations WHERE workspace_id = ${workspaceId} AND provider = ${provider}`;
    return rows.length ? mapIntegration(rows[0]) : null;
  },
  async getByWorkspaceAndProviderForUpdate(workspaceId, provider) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!provider) {
      provider = workspaceId;
      workspaceId = null;
    }
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.integrations WHERE workspace_id = ${workspaceId} AND provider = ${provider} FOR UPDATE`;
    return rows.length ? mapIntegration(rows[0]) : null;
  },
  async listConnectedGmail() {
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.integrations WHERE provider = 'gmail' AND status = 'connected' AND encrypted_credentials IS NOT NULL`;
    return rows.map(mapIntegration);
  },
  async listByWorkspaceId(workspaceId) {
    if (!workspaceId) throw new Error("Workspace context required");
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.integrations WHERE workspace_id = ${workspaceId}`;
    return rows.map(mapIntegration);
  },
  async create(workspaceId, i) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!i) {
      i = workspaceId;
      workspaceId = i.workspaceId || i.workspace_id;
      if (!workspaceId) throw new Error("Workspace context required");
    }
    await ensureConnection();
    await sql`
      INSERT INTO public.integrations (
        id, user_id, provider, status, encrypted_credentials, encryption_salt, connected_email, created_at, updated_at, workspace_id
      ) VALUES (
        ${i.id}, ${i.userId}, ${i.provider}, ${i.status || "connected"},
        ${i.encryptedCredentials || null}, ${i.encryptionSalt || null}, ${i.connectedEmail || null}, ${i.createdAt || new Date().toISOString()}, ${i.updatedAt || new Date().toISOString()}, ${workspaceId}
      )
    `;
    return { ...i, workspaceId };
  },
  async upsert(workspaceId, provider, values) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!values) {
      values = provider;
      provider = workspaceId;
      workspaceId = values.workspaceId || values.workspace_id;
      if (!workspaceId) throw new Error("Workspace context required");
    }
    await ensureConnection();
    const { id } = require("../utils/helpers");
    const newId = id("int");
    const status = values.status || "connected";
    const encryptedCredentials = values.encryptedCredentials || null;
    const encryptionSalt = values.encryptionSalt || null;
    const connectedEmail = values.connectedEmail || null;
    const nowStr = new Date().toISOString();

    const rows = await sql`
      INSERT INTO public.integrations (
        id, user_id, provider, status, encrypted_credentials, encryption_salt, connected_email, created_at, updated_at, workspace_id
      ) VALUES (
        ${newId}, ${values.userId || null}, ${provider}, ${status}, ${encryptedCredentials}, ${encryptionSalt}, ${connectedEmail}, ${nowStr}, ${nowStr}, ${workspaceId}
      )
      ON CONFLICT (workspace_id, provider) DO UPDATE SET
        status = COALESCE(${values.status ?? null}::text, public.integrations.status),
        encrypted_credentials = COALESCE(${values.encryptedCredentials ?? null}::text, public.integrations.encrypted_credentials),
        encryption_salt = COALESCE(${values.encryptionSalt ?? null}::text, public.integrations.encryption_salt),
        connected_email = COALESCE(${values.connectedEmail ?? null}::text, public.integrations.connected_email),
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `;
    return mapIntegration(rows[0]);
  },
  async updateLastSyncedAt(workspaceId, timestamp) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!timestamp) {
      timestamp = workspaceId;
      workspaceId = null;
    }
    await ensureConnection();
    const rows = await sql`
      UPDATE public.integrations SET last_synced_at = ${timestamp}, updated_at = ${timestamp}
      WHERE workspace_id = ${workspaceId} AND provider = 'gmail' RETURNING *
    `;
    return rows.length ? mapIntegration(rows[0]) : null;
  },
  async delete(workspaceId, id) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!id) {
      id = workspaceId;
      workspaceId = null;
    }
    await ensureConnection();
    await sql`DELETE FROM public.integrations WHERE id = ${id} AND workspace_id = ${workspaceId}`;
  },

  // Legacy compatibility
  async getByUserIdAndProvider(userId, provider) {
    await ensureConnection();
    const rows = await sql`
      SELECT i.* FROM public.integrations i
      JOIN public.businesses b ON b.id = i.workspace_id
      WHERE b.user_id = ${userId} AND i.provider = ${provider}
    `;
    return rows.length ? mapIntegration(rows[0]) : null;
  },
  async getByUserIdAndProviderForUpdate(userId, provider) {
    await ensureConnection();
    const rows = await sql`
      SELECT i.* FROM public.integrations i
      JOIN public.businesses b ON b.id = i.workspace_id
      WHERE b.user_id = ${userId} AND i.provider = ${provider} FOR UPDATE
    `;
    return rows.length ? mapIntegration(rows[0]) : null;
  },
  async listByUserId(userId) {
    await ensureConnection();
    const rows = await sql`
      SELECT i.* FROM public.integrations i
      JOIN public.businesses b ON b.id = i.workspace_id
      WHERE b.user_id = ${userId}
    `;
    return rows.map(mapIntegration);
  }
});

module.exports = {
  localIntegrations,
  postgresIntegrations
};
