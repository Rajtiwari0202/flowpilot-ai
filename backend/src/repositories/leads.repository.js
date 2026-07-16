const { mapLead } = require("./mappers");

const localLeads = (storePath, seedStorePath, perform) => ({
  async listByWorkspaceId(workspaceId, options = {}) {
    if (!workspaceId) throw new Error("Workspace context required");
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    let items = (store.leads || []).filter(l => (l.workspaceId || l.workspace_id) === workspaceId);

    // Apply filters
    if (options.status) {
      items = items.filter(l => l.status === options.status);
    }
    if (options.assignedTo || options.assigned_to) {
      const assignee = options.assignedTo || options.assigned_to;
      items = items.filter(l => (l.assignedTo || l.assigned_to) === assignee);
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      items = items.filter(l => 
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.phone && l.phone.toLowerCase().includes(q)) ||
        (l.message && l.message.toLowerCase().includes(q)) ||
        (l.notes && l.notes.toLowerCase().includes(q))
      );
    }

    // Sort by descending date
    items.sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));

    // Pagination
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Number(options.limit) || 20);
    const start = (page - 1) * limit;
    items = items.slice(start, start + limit);

    return items.map(mapLead);
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
    return mapLead(store.leads?.find(l => l.id === id && (l.workspaceId || l.workspace_id) === workspaceId));
  },
  async create(workspaceId, lead) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!lead) {
      lead = workspaceId;
      workspaceId = lead.workspaceId || lead.workspace_id;
      if (!workspaceId) throw new Error("Workspace context required");
    }
    await perform("leads", (coll) => {
      if (lead.gmailMessageId || lead.gmail_message_id) {
        const msgId = lead.gmailMessageId || lead.gmail_message_id;
        const exists = coll.some(item => (item.gmailMessageId || item.gmail_message_id) === msgId);
        if (exists) {
          const err = new Error("duplicate key value violates unique constraint on gmail_message_id");
          err.code = "23505";
          throw err;
        }
      }
      coll.push({
        ...lead,
        notes: lead.notes || null,
        tags: Array.isArray(lead.tags) ? lead.tags : [],
        assignedTo: lead.assignedTo || lead.assigned_to || null,
        workspaceId,
        workspace_id: workspaceId
      });
    });
    return lead;
  },
  async update(workspaceId, id, updates) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!updates) {
      updates = id;
      id = workspaceId;
      workspaceId = updates.workspaceId || updates.workspace_id;
      if (!workspaceId) throw new Error("Workspace context required");
    }
    return perform("leads", (coll) => {
      const l = coll.find(item => item.id === id && (item.workspaceId || item.workspace_id) === workspaceId);
      if (l) {
        if (updates.status !== undefined) l.status = updates.status;
        if (updates.notes !== undefined) l.notes = updates.notes;
        if (updates.tags !== undefined) l.tags = Array.isArray(updates.tags) ? updates.tags : [];
        if (updates.assignedTo !== undefined) l.assignedTo = updates.assignedTo;
        if (updates.assigned_to !== undefined) l.assignedTo = updates.assigned_to;
      }
      return mapLead(l);
    });
  },
  async getByGmailMessageId(workspaceId, gmailMessageId) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!gmailMessageId) {
      gmailMessageId = workspaceId;
      workspaceId = null;
    }
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    return mapLead(store.leads?.find(l => (l.workspaceId || l.workspace_id) === workspaceId && (l.gmailMessageId || l.gmail_message_id) === gmailMessageId));
  },
  
  // Legacy signatures for backwards compatibility
  async listByUserId(userId, options = {}) {
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    let items = (store.leads || []).filter(l => (l.userId || l.user_id) === userId);

    if (options.status) {
      items = items.filter(l => l.status === options.status);
    }
    if (options.assignedTo || options.assigned_to) {
      const assignee = options.assignedTo || options.assigned_to;
      items = items.filter(l => (l.assignedTo || l.assigned_to) === assignee);
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      items = items.filter(l => 
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.phone && l.phone.toLowerCase().includes(q)) ||
        (l.message && l.message.toLowerCase().includes(q)) ||
        (l.notes && l.notes.toLowerCase().includes(q))
      );
    }
    items.sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Number(options.limit) || 20);
    const start = (page - 1) * limit;
    items = items.slice(start, start + limit);

    return items.map(mapLead);
  }
});

const postgresLeads = (sql, ensureConnection) => ({
  async listByWorkspaceId(workspaceId, options = {}) {
    if (!workspaceId) throw new Error("Workspace context required");
    await ensureConnection();

    let query = sql`SELECT * FROM public.leads WHERE workspace_id = ${workspaceId}`;

    if (options.status) {
      query = sql`${query} AND status = ${options.status}`;
    }
    if (options.assignedTo || options.assigned_to) {
      const assignee = options.assignedTo || options.assigned_to;
      query = sql`${query} AND assigned_to = ${assignee}`;
    }
    if (options.search) {
      const q = `%${options.search}%`;
      query = sql`${query} AND (
        name ILIKE ${q} OR
        email ILIKE ${q} OR
        phone ILIKE ${q} OR
        message ILIKE ${q} OR
        notes ILIKE ${q}
      )`;
    }

    query = sql`${query} ORDER BY created_at DESC`;

    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Number(options.limit) || 20);
    const offset = (page - 1) * limit;

    query = sql`${query} LIMIT ${limit} OFFSET ${offset}`;

    const rows = await query;
    return rows.map(mapLead);
  },
  async getById(workspaceId, id) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!id) {
      id = workspaceId;
      workspaceId = null;
    }
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.leads WHERE id = ${id} AND workspace_id = ${workspaceId}`;
    return rows.length ? mapLead(rows[0]) : null;
  },
  async create(workspaceId, l) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!l) {
      l = workspaceId;
      workspaceId = l.workspaceId || l.workspace_id;
      if (!workspaceId) throw new Error("Workspace context required");
    }
    await ensureConnection();
    await sql`
      INSERT INTO public.leads (
        id, user_id, name, email, phone, message, source, status, gmail_message_id, created_at, workspace_id, notes, tags, assigned_to
      ) VALUES (
        ${l.id}, ${l.userId}, ${l.name}, ${l.email || null}, ${l.phone || null},
        ${l.message || ""}, ${l.source || "manual"}, ${l.status || "new"}, ${l.gmailMessageId || null},
        ${l.createdAt || new Date().toISOString()}, ${workspaceId}, ${l.notes || null},
        ${l.tags || []}, ${l.assignedTo || l.assigned_to || null}
      )
    `;
    return { ...l, workspaceId };
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
    if (updates.notes !== undefined) mapped.notes = updates.notes;
    if (updates.tags !== undefined) mapped.tags = Array.isArray(updates.tags) ? updates.tags : [];
    if (updates.assignedTo !== undefined) mapped.assigned_to = updates.assignedTo;
    if (updates.assigned_to !== undefined) mapped.assigned_to = updates.assigned_to;

    if (Object.keys(mapped).length === 0) return this.getById(workspaceId, id);

    const rows = await sql`
      UPDATE public.leads SET ${sql(mapped)} WHERE id = ${id} AND workspace_id = ${workspaceId} RETURNING *
    `;
    return rows.length ? mapLead(rows[0]) : null;
  },
  async getByGmailMessageId(workspaceId, gmailMessageId) {
    if (!workspaceId) throw new Error("Workspace context required");
    if (!gmailMessageId) {
      gmailMessageId = workspaceId;
      workspaceId = null;
    }
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.leads WHERE workspace_id = ${workspaceId} AND gmail_message_id = ${gmailMessageId}`;
    return rows.length ? mapLead(rows[0]) : null;
  },

  // Legacy compatibility
  async listByUserId(userId, options = {}) {
    await ensureConnection();
    let query = sql`SELECT * FROM public.leads WHERE user_id = ${userId}`;

    if (options.status) {
      query = sql`${query} AND status = ${options.status}`;
    }
    if (options.assignedTo || options.assigned_to) {
      const assignee = options.assignedTo || options.assigned_to;
      query = sql`${query} AND assigned_to = ${assignee}`;
    }
    if (options.search) {
      const q = `%${options.search}%`;
      query = sql`${query} AND (
        name ILIKE ${q} OR
        email ILIKE ${q} OR
        phone ILIKE ${q} OR
        message ILIKE ${q} OR
        notes ILIKE ${q}
      )`;
    }

    query = sql`${query} ORDER BY created_at DESC`;

    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Number(options.limit) || 20);
    const offset = (page - 1) * limit;

    query = sql`${query} LIMIT ${limit} OFFSET ${offset}`;

    const rows = await query;
    return rows.map(mapLead);
  }
});

module.exports = {
  localLeads,
  postgresLeads
};
