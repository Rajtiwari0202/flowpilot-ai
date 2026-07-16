const { mapAuditLog } = require("./mappers");

const localAuditLogs = (storePath, seedStorePath, perform) => ({
  async listByWorkspaceId(workspaceId) {
    if (!workspaceId) throw new Error("Workspace context required");
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    return (store.audit_logs || [])
      .filter(l => (l.workspaceId || l.workspace_id) === workspaceId)
      .map(mapAuditLog);
  },
  async create(workspaceId, auditLog) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!auditLog) {
      auditLog = workspaceId;
      workspaceId = auditLog.workspaceId || auditLog.workspace_id;
      if (!workspaceId) throw new Error("Workspace context required");
    }
    const record = {
      ...auditLog,
      workspaceId,
      workspace_id: workspaceId,
      actorType: auditLog.actorType || auditLog.actor_type || "user",
      actor_type: auditLog.actorType || auditLog.actor_type || "user",
      beforeState: auditLog.beforeState || auditLog.before_state || null,
      afterState: auditLog.afterState || auditLog.after_state || null,
      createdAt: auditLog.createdAt || auditLog.created_at || new Date().toISOString()
    };
    await perform("audit_logs", (coll) => coll.push(record));
    return mapAuditLog(record);
  }
});

const postgresAuditLogs = (sql, ensureConnection) => ({
  async listByWorkspaceId(workspaceId) {
    if (!workspaceId) throw new Error("Workspace context required");
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.audit_logs WHERE workspace_id = ${workspaceId} ORDER BY created_at DESC`;
    return rows.map(mapAuditLog);
  },
  async create(workspaceId, l) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!l) {
      l = workspaceId;
      workspaceId = l.workspaceId || l.workspace_id;
      if (!workspaceId) throw new Error("Workspace context required");
    }
    await ensureConnection();
    const actorId = l.actorId || l.actor_id || null;
    const actorType = l.actorType || l.actor_type || "user";
    const beforeState = l.beforeState || l.before_state || null;
    const afterState = l.afterState || l.after_state || null;
    const createdAt = l.createdAt || l.created_at || new Date().toISOString();

    await sql`
      INSERT INTO public.audit_logs (
        id, workspace_id, actor_id, actor_type, entity_type, entity_id, action, before_state, after_state, created_at
      ) VALUES (
        ${l.id}, ${workspaceId}, ${actorId}, ${actorType}, ${l.entityType}, ${l.entityId}, ${l.action},
        ${beforeState ? sql.json(beforeState) : null}::jsonb,
        ${afterState ? sql.json(afterState) : null}::jsonb,
        ${createdAt}
      )
    `;
    return { ...l, workspaceId };
  }
});

module.exports = {
  localAuditLogs,
  postgresAuditLogs
};
