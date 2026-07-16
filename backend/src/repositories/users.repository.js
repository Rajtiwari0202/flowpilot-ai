const { mapUser } = require("./mappers");

const localUsers = (storePath, seedStorePath, perform) => ({
  async getById(id) {
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    return mapUser(store.users?.find(u => u.id === id));
  },
  async getByEmail(email) {
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    return mapUser(store.users?.find(u => u.email?.toLowerCase() === email?.toLowerCase()));
  },
  async create(user) {
    await perform("users", (coll) => coll.push(user));
    return user;
  },
  async update(id, updates) {
    return perform("users", (coll) => {
      const u = coll.find(item => item.id === id);
      if (u) Object.assign(u, updates);
      return mapUser(u);
    });
  },
  async delete(id) {
    return perform("users", (coll, store) => {
      const idx = coll.findIndex(item => item.id === id);
      if (idx !== -1) coll.splice(idx, 1);
      ["businesses", "integrations", "workflows", "leads", "activity", "approvals", "authTokens", "outbox", "historicalAnalytics"].forEach(col => {
        if (Array.isArray(store[col])) {
          store[col] = store[col].filter(item => (item.userId || item.user_id) !== id);
        }
      });
    });
  },
  async list() {
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    return (store.users || []).map(mapUser);
  }
});

const postgresUsers = (sql, ensureConnection) => ({
  async getById(id) {
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.users WHERE id = ${id}`;
    return rows.length ? mapUser(rows[0]) : null;
  },
  async getByEmail(email) {
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.users WHERE LOWER(email) = ${email.toLowerCase()}`;
    return rows.length ? mapUser(rows[0]) : null;
  },
  async create(user) {
    await ensureConnection();
    await sql`
      INSERT INTO public.users (
        id, name, email, password_hash, email_verified, google_id, plan, billing, created_at, email_verified_at, password_changed_at
      ) VALUES (
        ${user.id}, ${user.name}, ${user.email}, ${user.passwordHash || null}, ${user.emailVerified || false},
        ${user.googleId || null}, ${user.plan || "free"}, ${user.billing ? sql.json(user.billing) : null},
        ${user.createdAt || new Date().toISOString()}, ${user.emailVerifiedAt || null}, ${user.passwordChangedAt || null}
      )
    `;
    return user;
  },
  async update(id, updates) {
    await ensureConnection();
    const mapped = {};
    if (updates.name !== undefined) mapped.name = updates.name;
    if (updates.email !== undefined) mapped.email = updates.email;
    if (updates.passwordHash !== undefined) mapped.password_hash = updates.passwordHash;
    if (updates.emailVerified !== undefined) mapped.email_verified = updates.emailVerified;
    if (updates.googleId !== undefined) mapped.google_id = updates.googleId;
    if (updates.plan !== undefined) mapped.plan = updates.plan;
    if (updates.billing !== undefined) mapped.billing = updates.billing ? sql.json(updates.billing) : null;
    if (updates.emailVerifiedAt !== undefined) mapped.email_verified_at = updates.emailVerifiedAt;
    if (updates.passwordChangedAt !== undefined) mapped.password_changed_at = updates.passwordChangedAt;

    if (Object.keys(mapped).length === 0) return this.getById(id);

    const rows = await sql`
      UPDATE public.users SET ${sql(mapped)} WHERE id = ${id} RETURNING *
    `;
    return rows.length ? mapUser(rows[0]) : null;
  },
  async delete(id) {
    await ensureConnection();
    await sql`DELETE FROM public.users WHERE id = ${id}`;
  },
  async list() {
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.users ORDER BY created_at ASC`;
    return rows.map(mapUser);
  }
});

module.exports = {
  localUsers,
  postgresUsers
};
