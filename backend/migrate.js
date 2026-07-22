const fs = require("fs");
const path = require("path");
const postgres = require("postgres");

if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) {
  console.error("Set DIRECT_URL or DATABASE_URL before running migrations.");
  process.exit(1);
}

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const sql = postgres(databaseUrl, {
  ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
  max: 1
});

const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");

async function run() {
  try {
    // 1. Create schema_migrations tracking table
    await sql`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 2. Read all migration files
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith(".sql"))
      .sort();

    console.log(`Found ${files.length} migration files in supabase/migrations/`);

    for (const file of files) {
      // Check if already applied in tracking table
      const existing = await sql`
        SELECT 1 FROM public.schema_migrations WHERE filename = ${file}
      `;

      if (existing.length > 0) {
        console.log(`Migration ${file} already applied (tracked).`);
        continue;
      }

      // Self-heal: Check if the migration was previously applied outside tracking table
      let alreadyApplied = false;
      if (file.includes("202606020001_flowpilot_core")) {
        const check = await sql`
          SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flowpilot_records')
        `;
        alreadyApplied = check[0].exists;
      } else if (file.includes("20260713000000_normalized_tables")) {
        const check = await sql`
          SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
        `;
        alreadyApplied = check[0].exists;
      } else if (file.includes("20260716000000_workspace_members")) {
        const check = await sql`
          SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspace_members')
        `;
        alreadyApplied = check[0].exists;
      }

      if (alreadyApplied) {
        console.log(`Migration ${file} was previously applied. Recording in schema_migrations.`);
        await sql`
          INSERT INTO public.schema_migrations (filename) VALUES (${file}) ON CONFLICT DO NOTHING
        `;
        continue;
      }

      // Apply new migration inside a transaction
      console.log(`Applying migration: ${file}...`);
      const content = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      
      await sql.begin(async (tx) => {
        await tx.unsafe(content);
        await tx`
          INSERT INTO public.schema_migrations (filename) VALUES (${file})
        `;
      });
      
      console.log(`✅ Applied ${file} successfully.`);
    }

    console.log("All database migrations applied successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
