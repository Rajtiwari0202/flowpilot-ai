const fs = require("fs");
const path = require("path");

if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) {
  console.error("Set DIRECT_URL or DATABASE_URL before running migrations.");
  process.exit(1);
}

const postgres = require("postgres");
const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const sql = postgres(databaseUrl, { ssl: process.env.DATABASE_SSL === "disable" ? false : "require", max: 1 });
const migrationPath = path.join(__dirname, "..", "supabase", "migrations", "202606020001_flowpilot_core.sql");

(async () => {
  try {
    await sql.unsafe(fs.readFileSync(migrationPath, "utf8"));
    console.log("FlowPilot Postgres migration applied.");
  } finally {
    await sql.end();
  }
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
