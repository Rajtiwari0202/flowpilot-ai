const fs = require("fs");
const path = require("path");

const COLLECTIONS = ["users", "businesses", "integrations", "templates", "workflows", "leads", "activity", "approvals", "processedWebhookEvents", "authTokens", "outbox"];

function emptyStore() {
  return Object.fromEntries(COLLECTIONS.map((collection) => [collection, []]));
}

function normalizeStore(store) {
  const normalized = emptyStore();
  for (const collection of COLLECTIONS) normalized[collection] = Array.isArray(store[collection]) ? store[collection] : [];
  return normalized;
}

function createLocalRepository({ seedStorePath, storePath }) {
  return {
    mode: "local_json",
    async read() {
      if (!fs.existsSync(storePath)) fs.copyFileSync(seedStorePath, storePath);
      return normalizeStore(JSON.parse(fs.readFileSync(storePath, "utf8")));
    },
    async write(store) {
      fs.writeFileSync(storePath, JSON.stringify(normalizeStore(store), null, 2));
    },
    async close() {}
  };
}

function createPostgresRepository({ databaseUrl, seedStorePath }) {
  const postgres = require("postgres");
  const connectionUrl = new URL(databaseUrl);
  if (!connectionUrl.pathname || connectionUrl.pathname === "/") connectionUrl.pathname = "/postgres";
  const sql = postgres(connectionUrl.toString(), {
    ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
    max: Number(process.env.DATABASE_POOL_SIZE || 5),
    idle_timeout: 20,
    connect_timeout: 10
  });

  async function write(store) {
    const normalized = normalizeStore(store);
    await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(721904)`;
      await tx`delete from public.flowpilot_records`;
      for (const collection of COLLECTIONS) {
        for (const item of normalized[collection]) {
          const data = typeof item === "string" ? { id: item, value: item } : item;
          const recordId = data.id;
          if (!recordId) throw new Error(`Missing id in ${collection} record`);
          await tx`
            insert into public.flowpilot_records (collection, record_id, user_id, data)
            values (${collection}, ${recordId}, ${data.userId || null}, ${tx.json(data)})
          `;
        }
      }
    });
  }

  return {
    mode: "supabase_postgres",
    async read() {
      const rows = await sql`select collection, data from public.flowpilot_records order by created_at asc`;
      if (!rows.length) {
        const seed = normalizeStore(JSON.parse(fs.readFileSync(seedStorePath, "utf8")));
        await write(seed);
        return seed;
      }
      const store = emptyStore();
      for (const row of rows) {
        if (!store[row.collection]) continue;
        store[row.collection].push(row.collection === "processedWebhookEvents" ? row.data.value : row.data);
      }
      return store;
    },
    write,
    async close() {
      await sql.end();
    }
  };
}

function createRepository({ seedStorePath, storePath }) {
  if (process.env.DATABASE_URL) return createPostgresRepository({ databaseUrl: process.env.DATABASE_URL, seedStorePath });
  return createLocalRepository({ seedStorePath, storePath });
}

module.exports = { COLLECTIONS, createRepository, emptyStore, normalizeStore };
