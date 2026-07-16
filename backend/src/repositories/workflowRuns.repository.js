const { mapWorkflowRun } = require("./mappers");

const localWorkflowRuns = (storePath, seedStorePath, perform) => ({
  async getById(workspaceId, id) {
    if (!workspaceId) throw new Error("Workspace context required");
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    const row = store.workflow_runs?.find(r => r.id === id && (r.workspaceId || r.workspace_id) === workspaceId);
    return mapWorkflowRun(row);
  },
  async listByWorkflowId(workspaceId, workflowId) {
    if (!workspaceId) throw new Error("Workspace context required");
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    return (store.workflow_runs || [])
      .filter(r => (r.workspaceId || r.workspace_id) === workspaceId && (r.workflowId || r.workflow_id) === workflowId)
      .map(mapWorkflowRun);
  },
  async create(workspaceId, run) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!run) {
      run = workspaceId;
      workspaceId = run.workspaceId || run.workspace_id;
      if (!workspaceId) throw new Error("Workspace context required");
    }
    const record = {
      ...run,
      workspaceId,
      workspace_id: workspaceId,
      attemptCount: run.attemptCount || 0,
      errorMessage: run.errorMessage || null,
      startedAt: run.startedAt || null,
      completedAt: run.completedAt || null,
      createdAt: run.createdAt || new Date().toISOString()
    };
    await perform("workflow_runs", (coll) => coll.push(record));
    return mapWorkflowRun(record);
  },
  async update(workspaceId, id, updates) {
    if (!workspaceId) throw new Error("Workspace context required");
    return perform("workflow_runs", (coll) => {
      const r = coll.find(item => item.id === id && (item.workspaceId || item.workspace_id) === workspaceId);
      if (r) {
        if (updates.status !== undefined) r.status = updates.status;
        if (updates.attemptCount !== undefined) r.attemptCount = updates.attemptCount;
        if (updates.errorMessage !== undefined) r.errorMessage = updates.errorMessage;
        if (updates.startedAt !== undefined) r.startedAt = updates.startedAt;
        if (updates.completedAt !== undefined) r.completedAt = updates.completedAt;
      }
      return mapWorkflowRun(r);
    });
  }
});

const postgresWorkflowRuns = (sql, ensureConnection) => ({
  async getById(workspaceId, id) {
    if (!workspaceId) throw new Error("Workspace context required");
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.workflow_runs WHERE id = ${id} AND workspace_id = ${workspaceId}`;
    return rows.length ? mapWorkflowRun(rows[0]) : null;
  },
  async listByWorkflowId(workspaceId, workflowId) {
    if (!workspaceId) throw new Error("Workspace context required");
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.workflow_runs WHERE workspace_id = ${workspaceId} AND workflow_id = ${workflowId} ORDER BY created_at DESC`;
    return rows.map(mapWorkflowRun);
  },
  async create(workspaceId, r) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!r) {
      r = workspaceId;
      workspaceId = r.workspaceId || r.workspace_id;
      if (!workspaceId) throw new Error("Workspace context required");
    }
    await ensureConnection();
    const attemptCount = r.attemptCount || 0;
    const errorMessage = r.errorMessage || null;
    const startedAt = r.startedAt || null;
    const completedAt = r.completedAt || null;
    const createdAt = r.createdAt || new Date().toISOString();

    await sql`
      INSERT INTO public.workflow_runs (
        id, workspace_id, workflow_id, trigger_key, status, attempt_count, error_message, started_at, completed_at, created_at
      ) VALUES (
        ${r.id}, ${workspaceId}, ${r.workflowId}, ${r.triggerKey}, ${r.status}, ${attemptCount}, ${errorMessage}, ${startedAt}, ${completedAt}, ${createdAt}
      )
    `;
    return { ...r, workspaceId };
  },
  async update(workspaceId, id, updates) {
    if (!workspaceId) throw new Error("Workspace context required");
    await ensureConnection();
    const mapped = {};
    if (updates.status !== undefined) mapped.status = updates.status;
    if (updates.attemptCount !== undefined) mapped.attempt_count = updates.attemptCount;
    if (updates.errorMessage !== undefined) mapped.error_message = updates.errorMessage;
    if (updates.startedAt !== undefined) mapped.started_at = updates.startedAt;
    if (updates.completedAt !== undefined) mapped.completed_at = updates.completedAt;

    if (Object.keys(mapped).length === 0) return this.getById(workspaceId, id);

    const rows = await sql`
      UPDATE public.workflow_runs SET ${sql(mapped)} WHERE id = ${id} AND workspace_id = ${workspaceId} RETURNING *
    `;
    return rows.length ? mapWorkflowRun(rows[0]) : null;
  }
});

module.exports = {
  localWorkflowRuns,
  postgresWorkflowRuns
};
