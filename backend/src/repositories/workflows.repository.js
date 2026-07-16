const { mapWorkflow } = require("./mappers");

const localWorkflows = (storePath, seedStorePath, perform) => ({
  async listByWorkspaceId(workspaceId) {
    if (!workspaceId) throw new Error("Workspace context required");
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    return (store.workflows || []).filter(w => (w.workspaceId || w.workspace_id) === workspaceId).map(mapWorkflow);
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
    return mapWorkflow(store.workflows?.find(w => w.id === id && (w.workspaceId || w.workspace_id) === workspaceId));
  },
  async create(workspaceId, workflow) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!workflow) {
      workflow = workspaceId;
      workspaceId = workflow.workspaceId || workflow.workspace_id;
      if (!workspaceId) throw new Error("Workspace context required");
    }
    await perform("workflows", (coll) => coll.push({ ...workflow, workspaceId, workspace_id: workspaceId }));
    return workflow;
  },
  async update(workspaceId, id, updates) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!updates) {
      updates = id;
      id = workspaceId;
      workspaceId = updates.workspaceId || updates.workspace_id;
      if (!workspaceId) throw new Error("Workspace context required");
    }
    return perform("workflows", (coll) => {
      const w = coll.find(item => item.id === id && (item.workspaceId || item.workspace_id) === workspaceId);
      if (w) Object.assign(w, updates);
      return mapWorkflow(w);
    });
  },
  async incrementRuns(workspaceId, id) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!id) {
      id = workspaceId;
      workspaceId = null;
    }
    return perform("workflows", (coll) => {
      const w = coll.find(item => item.id === id && (item.workspaceId || item.workspace_id) === workspaceId);
      if (w) w.runs = (w.runs || 0) + 1;
      return mapWorkflow(w);
    });
  },
  async delete(workspaceId, id) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!id) {
      id = workspaceId;
      workspaceId = null;
    }
    return perform("workflows", (coll) => {
      const idx = coll.findIndex(item => item.id === id && (item.workspaceId || item.workspace_id) === workspaceId);
      if (idx !== -1) coll.splice(idx, 1);
    });
  },
  
  // Legacy signatures for backwards compatibility
  async listByUserId(userId) {
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    return (store.workflows || []).filter(w => (w.userId || w.user_id) === userId).map(mapWorkflow);
  }
});

const postgresWorkflows = (sql, ensureConnection) => ({
  async listByWorkspaceId(workspaceId) {
    if (!workspaceId) throw new Error("Workspace context required");
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.workflows WHERE workspace_id = ${workspaceId} ORDER BY created_at ASC`;
    return rows.map(mapWorkflow);
  },
  async getById(workspaceId, id) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!id) {
      id = workspaceId;
      workspaceId = null;
    }
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.workflows WHERE id = ${id} AND workspace_id = ${workspaceId}`;
    return rows.length ? mapWorkflow(rows[0]) : null;
  },
  async create(workspaceId, w) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!w) {
      w = workspaceId;
      workspaceId = w.workspaceId || w.workspace_id;
      if (!workspaceId) throw new Error("Workspace context required");
    }
    await ensureConnection();
    await sql`
      INSERT INTO public.workflows (
        id, user_id, template_id, name, status, trigger_key, actions, runs, created_at, updated_at, workspace_id
      ) VALUES (
        ${w.id}, ${w.userId}, ${w.templateId || null}, ${w.name}, ${w.status || "active"},
        ${w.triggerKey || w.trigger || "lead.created"}, ${w.actions ? sql.json(w.actions) : "[]"}::jsonb, ${w.runs || 0},
        ${w.createdAt || new Date().toISOString()}, ${w.updatedAt || new Date().toISOString()}, ${workspaceId}
      )
    `;
    return { ...w, workspaceId };
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
    if (updates.status !== undefined) mapped.status = updates.status;
    if (updates.runs !== undefined) mapped.runs = updates.runs;
    mapped.updated_at = updates.updatedAt || new Date().toISOString();

    const rows = await sql`
      UPDATE public.workflows SET ${sql(mapped)} WHERE id = ${id} AND workspace_id = ${workspaceId} RETURNING *
    `;
    return rows.length ? mapWorkflow(rows[0]) : null;
  },
  async incrementRuns(workspaceId, id) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!id) {
      id = workspaceId;
      workspaceId = null;
    }
    await ensureConnection();
    const rows = await sql`
      UPDATE public.workflows SET runs = COALESCE(runs, 0) + 1, updated_at = NOW() 
      WHERE id = ${id} AND workspace_id = ${workspaceId} RETURNING *
    `;
    return rows.length ? mapWorkflow(rows[0]) : null;
  },
  async delete(workspaceId, id) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!id) {
      id = workspaceId;
      workspaceId = null;
    }
    await ensureConnection();
    await sql`DELETE FROM public.workflows WHERE id = ${id} AND workspace_id = ${workspaceId}`;
  },

  // Legacy compatibility
  async listByUserId(userId) {
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.workflows WHERE user_id = ${userId} ORDER BY created_at ASC`;
    return rows.map(mapWorkflow);
  }
});

module.exports = {
  localWorkflows,
  postgresWorkflows
};
