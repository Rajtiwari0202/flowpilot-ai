const { mapNotification } = require("./mappers");

const localNotifications = (storePath, seedStorePath, perform) => ({
  async listByUserId(workspaceId, userId, options = {}) {
    if (!workspaceId) throw new Error("Workspace context required");
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    let items = (store.notifications || []).filter(
      n => (n.workspaceId || n.workspace_id) === workspaceId && n.userId === userId
    );

    if (options.unreadOnly === true) {
      items = items.filter(n => !n.read);
    }

    // Sort by created_at DESC by default
    items.sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));

    const offset = options.offset || 0;
    const limit = options.limit || 50;
    items = items.slice(offset, offset + limit);

    return items.map(mapNotification);
  },
  async countUnread(workspaceId, userId) {
    if (!workspaceId) throw new Error("Workspace context required");
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    const items = (store.notifications || []).filter(
      n => (n.workspaceId || n.workspace_id) === workspaceId && n.userId === userId && !n.read
    );
    return items.length;
  },
  async create(workspaceId, notification) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!notification) {
      notification = workspaceId;
      workspaceId = notification.workspaceId || notification.workspace_id;
      if (!workspaceId) throw new Error("Workspace context required");
    }
    const record = {
      ...notification,
      workspaceId,
      workspace_id: workspaceId,
      read: notification.read === true,
      metadata: notification.metadata || {},
      createdAt: notification.createdAt || new Date().toISOString()
    };
    await perform("notifications", (coll) => coll.push(record));
    return mapNotification(record);
  },
  async markAsRead(workspaceId, id, userId) {
    if (!workspaceId) throw new Error("Workspace context required");
    return perform("notifications", (coll) => {
      const idx = coll.findIndex(
        n => n.id === id && (n.workspaceId || n.workspace_id) === workspaceId && n.userId === userId
      );
      if (idx !== -1) {
        coll[idx].read = true;
        return mapNotification(coll[idx]);
      }
      return null;
    });
  },
  async markAllAsRead(workspaceId, userId) {
    if (!workspaceId) throw new Error("Workspace context required");
    await perform("notifications", (coll) => {
      coll.forEach(n => {
        if ((n.workspaceId || n.workspace_id) === workspaceId && n.userId === userId) {
          n.read = true;
        }
      });
    });
    return true;
  }
});

const postgresNotifications = (sql, ensureConnection) => ({
  async listByUserId(workspaceId, userId, options = {}) {
    if (!workspaceId) throw new Error("Workspace context required");
    await ensureConnection();
    
    let query = sql`
      SELECT * FROM public.notifications 
      WHERE workspace_id = ${workspaceId} AND user_id = ${userId}
    `;

    if (options.unreadOnly === true) {
      query = sql`${query} AND read = false`;
    }

    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const rows = await sql`
      ${query}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return rows.map(mapNotification);
  },
  async countUnread(workspaceId, userId) {
    if (!workspaceId) throw new Error("Workspace context required");
    await ensureConnection();
    const rows = await sql`
      SELECT COUNT(*)::integer as count 
      FROM public.notifications 
      WHERE workspace_id = ${workspaceId} AND user_id = ${userId} AND read = false
    `;
    return rows[0]?.count || 0;
  },
  async create(workspaceId, n) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!n) {
      n = workspaceId;
      workspaceId = n.workspaceId || n.workspace_id;
      if (!workspaceId) throw new Error("Workspace context required");
    }
    await ensureConnection();
    const read = n.read === true;
    const metadata = n.metadata || {};
    const createdAt = n.createdAt || new Date().toISOString();

    await sql`
      INSERT INTO public.notifications (
        id, workspace_id, user_id, type, title, message, read, metadata, created_at
      ) VALUES (
        ${n.id}, ${workspaceId}, ${n.userId}, ${n.type}, ${n.title}, ${n.message}, ${read},
        ${sql.json(metadata)}::jsonb,
        ${createdAt}
      )
    `;
    return { ...n, workspaceId };
  },
  async markAsRead(workspaceId, id, userId) {
    if (!workspaceId) throw new Error("Workspace context required");
    await ensureConnection();
    const rows = await sql`
      UPDATE public.notifications 
      SET read = true 
      WHERE id = ${id} AND workspace_id = ${workspaceId} AND user_id = ${userId}
      RETURNING *
    `;
    return rows.length ? mapNotification(rows[0]) : null;
  },
  async markAllAsRead(workspaceId, userId) {
    if (!workspaceId) throw new Error("Workspace context required");
    await ensureConnection();
    await sql`
      UPDATE public.notifications 
      SET read = true 
      WHERE workspace_id = ${workspaceId} AND user_id = ${userId} AND read = false
    `;
    return true;
  }
});

module.exports = {
  localNotifications,
  postgresNotifications
};
