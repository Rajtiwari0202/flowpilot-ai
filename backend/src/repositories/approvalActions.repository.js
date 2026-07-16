const { mapApprovalAction } = require("./mappers");

const localApprovalActions = (storePath, seedStorePath, perform) => ({
  async listByApprovalId(workspaceId, approvalId) {
    if (!workspaceId) throw new Error("Workspace context required");
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    return (store.approval_actions || [])
      .filter(a => (a.workspaceId || a.workspace_id) === workspaceId && (a.approvalId || a.approval_id) === approvalId)
      .map(mapApprovalAction);
  },
  async create(workspaceId, action) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!action) {
      action = workspaceId;
      workspaceId = action.workspaceId || action.workspace_id;
      if (!workspaceId) throw new Error("Workspace context required");
    }
    const record = {
      ...action,
      workspaceId,
      workspace_id: workspaceId,
      createdAt: action.createdAt || new Date().toISOString()
    };
    await perform("approval_actions", (coll) => coll.push(record));
    return mapApprovalAction(record);
  }
});

const postgresApprovalActions = (sql, ensureConnection) => ({
  async listByApprovalId(workspaceId, approvalId) {
    if (!workspaceId) throw new Error("Workspace context required");
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.approval_actions WHERE workspace_id = ${workspaceId} AND approval_id = ${approvalId} ORDER BY created_at ASC`;
    return rows.map(mapApprovalAction);
  },
  async create(workspaceId, a) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!a) {
      a = workspaceId;
      workspaceId = a.workspaceId || a.workspace_id;
      if (!workspaceId) throw new Error("Workspace context required");
    }
    await ensureConnection();
    const notes = a.notes || null;
    const createdAt = a.createdAt || new Date().toISOString();

    await sql`
      INSERT INTO public.approval_actions (
        id, workspace_id, approval_id, actor_id, action, notes, created_at
      ) VALUES (
        ${a.id}, ${workspaceId}, ${a.approvalId}, ${a.actorId}, ${a.action}, ${notes}, ${createdAt}
      )
    `;
    return { ...a, workspaceId };
  }
});

module.exports = {
  localApprovalActions,
  postgresApprovalActions
};
