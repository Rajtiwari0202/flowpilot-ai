const { mapWorkspaceMember } = require("./mappers");

const localWorkspaceMembers = (storePath, seedStorePath, perform) => ({
  async listByWorkspaceId(workspaceId) {
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    return (store.workspace_members || []).filter(m => (m.workspaceId || m.workspace_id) === workspaceId).map(mapWorkspaceMember);
  },
  async listByUserId(userId) {
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    return (store.workspace_members || []).filter(m => (m.userId || m.user_id) === userId).map(mapWorkspaceMember);
  },
  async getByWorkspaceAndUser(workspaceId, userId) {
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    return mapWorkspaceMember(store.workspace_members?.find(m => (m.workspaceId || m.workspace_id) === workspaceId && (m.userId || m.user_id) === userId));
  },
  async create(member) {
    await perform("workspace_members", (coll) => coll.push(member));
    return member;
  },
  async update(id, updates) {
    return perform("workspace_members", (coll) => {
      const m = coll.find(item => item.id === id);
      if (m) Object.assign(m, updates);
      return mapWorkspaceMember(m);
    });
  },
  async delete(id) {
    return perform("workspace_members", (coll) => {
      const idx = coll.findIndex(item => item.id === id);
      if (idx !== -1) coll.splice(idx, 1);
    });
  }
});

const postgresWorkspaceMembers = (sql, ensureConnection) => ({
  async listByWorkspaceId(workspaceId) {
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.workspace_members WHERE workspace_id = ${workspaceId} ORDER BY created_at ASC`;
    return rows.map(mapWorkspaceMember);
  },
  async listByUserId(userId) {
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.workspace_members WHERE user_id = ${userId} ORDER BY created_at ASC`;
    return rows.map(mapWorkspaceMember);
  },
  async getByWorkspaceAndUser(workspaceId, userId) {
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.workspace_members WHERE workspace_id = ${workspaceId} AND user_id = ${userId}`;
    return rows.length ? mapWorkspaceMember(rows[0]) : null;
  },
  async create(m) {
    await ensureConnection();
    await sql`
      INSERT INTO public.workspace_members (
        id, workspace_id, user_id, role, created_at, updated_at
      ) VALUES (
        ${m.id}, ${m.workspaceId}, ${m.userId}, ${m.role || "member"},
        ${m.createdAt || new Date().toISOString()}, ${m.updatedAt || new Date().toISOString()}
      )
    `;
    return m;
  },
  async update(id, updates) {
    await ensureConnection();
    const mapped = {};
    if (updates.role !== undefined) mapped.role = updates.role;
    mapped.updated_at = new Date().toISOString();

    if (Object.keys(mapped).length === 0) return;

    const rows = await sql`
      UPDATE public.workspace_members SET ${sql(mapped)} WHERE id = ${id} RETURNING *
    `;
    return rows.length ? mapWorkspaceMember(rows[0]) : null;
  },
  async delete(id) {
    await ensureConnection();
    await sql`DELETE FROM public.workspace_members WHERE id = ${id}`;
  }
});

module.exports = {
  localWorkspaceMembers,
  postgresWorkspaceMembers
};
