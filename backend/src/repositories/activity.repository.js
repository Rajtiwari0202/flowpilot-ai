const { mapActivity } = require("./mappers");

const localActivity = (storePath, seedStorePath, perform) => ({
  async listByWorkspaceId(workspaceId) {
    if (!workspaceId) throw new Error("Workspace context required");
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    return (store.activity || []).filter(ac => (ac.workspaceId || ac.workspace_id) === workspaceId).map(mapActivity);
  },
  async create(workspaceId, act) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!act) {
      act = workspaceId;
      workspaceId = act.workspaceId || act.workspace_id;
      if (!workspaceId) throw new Error("Workspace context required");
    }
    const { id, now } = require("../utils/helpers");
    const row = { id: id("act"), createdAt: now(), status: "success", ...act, workspaceId, workspace_id: workspaceId };
    await perform("activity", (coll) => coll.unshift(row));
    return mapActivity(row);
  },
  
  // Legacy signatures for backwards compatibility
  async listByUserId(userId) {
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    return (store.activity || []).filter(ac => (ac.userId || ac.user_id) === userId).map(mapActivity);
  }
});

const postgresActivity = (sql, ensureConnection) => ({
  async listByWorkspaceId(workspaceId) {
    if (!workspaceId) throw new Error("Workspace context required");
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.activity_logs WHERE workspace_id = ${workspaceId} ORDER BY created_at DESC`;
    return rows.map(mapActivity);
  },
  async create(workspaceId, act) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!act) {
      act = workspaceId;
      workspaceId = act.workspaceId || act.workspace_id;
      if (!workspaceId) throw new Error("Workspace context required");
    }
    await ensureConnection();
    const { id, now } = require("../utils/helpers");
    const actId = act.id || id("act");
    const createdAt = act.createdAt || now();
    await sql`
      INSERT INTO public.activity_logs (
        id, user_id, type, label, source, status, created_at, workspace_id
      ) VALUES (
        ${actId}, ${act.userId}, ${act.type}, ${act.label}, ${act.source || "system"}, ${act.status || "success"}, ${createdAt}, ${workspaceId}
      )
    `;
    return { id: actId, createdAt, status: act.status || "success", ...act, workspaceId };
  },

  // Legacy compatibility
  async listByUserId(userId) {
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.activity_logs WHERE user_id = ${userId} ORDER BY created_at DESC`;
    return rows.map(mapActivity);
  }
});

module.exports = {
  localActivity,
  postgresActivity
};
