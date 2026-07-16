const { mapApproval } = require("./mappers");

const localApprovals = (storePath, seedStorePath, perform) => ({
  async listByWorkspaceId(workspaceId) {
    if (!workspaceId) throw new Error("Workspace context required");
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    return (store.approvals || []).filter(a => (a.workspaceId || a.workspace_id) === workspaceId).map(mapApproval);
  },
  async getById(workspaceId, id) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!id) {
      id = workspaceId;
      workspaceId = null;
    }
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    return mapApproval(store.approvals?.find(a => a.id === id && (a.workspaceId || a.workspace_id) === workspaceId));
  },
  async getByLeadId(workspaceId, leadId) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!leadId) {
      leadId = workspaceId;
      workspaceId = null;
    }
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    return mapApproval(store.approvals?.find(a => (a.leadId || a.lead_id) === leadId && (a.workspaceId || a.workspace_id) === workspaceId));
  },
  async create(workspaceId, approval) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!approval) {
      approval = workspaceId;
      workspaceId = approval.workspaceId || approval.workspace_id;
      if (!workspaceId) throw new Error("Workspace context required");
    }
    await perform("approvals", (coll) => {
      const exists = coll.some(item => (item.leadId || item.lead_id) === (approval.leadId || approval.lead_id));
      if (exists) {
        const err = new Error("duplicate key value violates unique constraint on lead_id");
        err.code = "23505";
        throw err;
      }
      coll.push({ ...approval, workspaceId, workspace_id: workspaceId });
    });
    return approval;
  },
  async update(workspaceId, id, updates) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!updates) {
      updates = id;
      id = workspaceId;
      workspaceId = updates.workspaceId || updates.workspace_id;
      if (!workspaceId) throw new Error("Workspace context required");
    }
    return perform("approvals", (coll) => {
      const a = coll.find(item => item.id === id && (item.workspaceId || item.workspace_id) === workspaceId);
      if (a) Object.assign(a, updates);
      return mapApproval(a);
    });
  },
  
  // Legacy signatures for backwards compatibility
  async listByUserId(userId) {
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    return (store.approvals || []).filter(a => (a.userId || a.user_id) === userId).map(mapApproval);
  }
});

const postgresApprovals = (sql, ensureConnection) => ({
  async listByWorkspaceId(workspaceId) {
    if (!workspaceId) throw new Error("Workspace context required");
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.approvals WHERE workspace_id = ${workspaceId} ORDER BY created_at ASC`;
    return rows.map(mapApproval);
  },
  async getById(workspaceId, id) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!id) {
      id = workspaceId;
      workspaceId = null;
    }
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.approvals WHERE id = ${id} AND workspace_id = ${workspaceId}`;
    return rows.length ? mapApproval(rows[0]) : null;
  },
  async getByLeadId(workspaceId, leadId) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!leadId) {
      leadId = workspaceId;
      workspaceId = null;
    }
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.approvals WHERE lead_id = ${leadId} AND workspace_id = ${workspaceId}`;
    return rows.length ? mapApproval(rows[0]) : null;
  },
  async create(workspaceId, a) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!a) {
      a = workspaceId;
      workspaceId = a.workspaceId || a.workspace_id;
      if (!workspaceId) throw new Error("Workspace context required");
    }
    await ensureConnection();
    await sql`
      INSERT INTO public.approvals (
        id, user_id, lead_id, status, kind, draft, ai_provider, delivery_provider, created_at, resolved_at, workspace_id, prompt_version, confidence
      ) VALUES (
        ${a.id}, ${a.userId}, ${a.leadId}, ${a.status || "pending"}, ${a.kind || "follow_up_draft"},
        ${a.draft || null}, ${a.aiProvider || null}, ${a.deliveryProvider || null},
        ${a.createdAt || new Date().toISOString()}, ${a.resolvedAt || null}, ${workspaceId}, ${a.promptVersion || a.prompt_version || null}, ${a.confidence || null}
      )
    `;
    return { ...a, workspaceId };
  },
  async update(workspaceId, id, updates) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!updates) {
      updates = id;
      id = workspaceId;
      workspaceId = updates.workspaceId || updates.workspace_id;
      if (!workspaceId) throw new Error("Workspace context required");
    }
    await ensureConnection();
    const mapped = {};
    if (updates.draft !== undefined) mapped.draft = updates.draft;
    if (updates.status !== undefined) mapped.status = updates.status;
    if (updates.deliveryProvider !== undefined) mapped.delivery_provider = updates.deliveryProvider;
    if (updates.resolvedAt !== undefined) mapped.resolved_at = updates.resolvedAt;

    if (Object.keys(mapped).length === 0) return this.getById(workspaceId, id);

    const rows = await sql`
      UPDATE public.approvals SET ${sql(mapped)} WHERE id = ${id} AND workspace_id = ${workspaceId} RETURNING *
    `;
    return rows.length ? mapApproval(rows[0]) : null;
  },

  // Legacy compatibility
  async listByUserId(userId) {
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.approvals WHERE user_id = ${userId} ORDER BY created_at ASC`;
    return rows.map(mapApproval);
  }
});

module.exports = {
  localApprovals,
  postgresApprovals
};
