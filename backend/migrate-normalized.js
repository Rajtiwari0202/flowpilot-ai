const fs = require("fs");
const path = require("path");

if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) {
  console.error("Set DIRECT_URL or DATABASE_URL before running migrations.");
  process.exit(1);
}

const postgres = require("postgres");
const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const sql = postgres(databaseUrl, {
  ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
  max: 1
});

const migrationPath = path.join(__dirname, "..", "supabase", "migrations", "20260713000000_normalized_tables.sql");

async function checkOldTableExists() {
  const result = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'flowpilot_records'
    );
  `;
  return result[0].exists;
}

(async () => {
  try {
    console.log("Applying normalized table DDL schemas...");
    await sql.unsafe(fs.readFileSync(migrationPath, "utf8"));
    console.log("✅ Normalized schemas verified/created.");

    const oldExists = await checkOldTableExists();
    if (!oldExists) {
      console.log("Old flowpilot_records table does not exist. Skipping data migration.");
      return;
    }

    const rowsCount = await sql`SELECT count(*) FROM public.flowpilot_records`;
    const count = parseInt(rowsCount[0].count, 10);
    console.log(`Audited legacy table count: ${count} records.`);

    if (count === 0) {
      console.log("No legacy data found to migrate. Migration completed.");
      return;
    }

    console.log("Starting transactional data migration...");
    const oldRows = await sql`SELECT collection, record_id, user_id, data FROM public.flowpilot_records`;

    await sql.begin(async (tx) => {
      for (const row of oldRows) {
        const { collection, data } = row;

        if (collection === "users") {
          await tx`
            INSERT INTO public.users (
              id, name, email, password_hash, email_verified, google_id, plan, billing, created_at, email_verified_at, password_changed_at
            ) VALUES (
              ${data.id}, ${data.name}, ${data.email}, ${data.passwordHash || null}, ${data.emailVerified || false},
              ${data.googleId || null}, ${data.plan || "free"}, ${data.billing ? tx.json(data.billing) : null},
              ${data.createdAt}, ${data.emailVerifiedAt || null}, ${data.passwordChangedAt || null}
            ) ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              email = EXCLUDED.email,
              password_hash = EXCLUDED.password_hash,
              email_verified = EXCLUDED.email_verified,
              google_id = EXCLUDED.google_id,
              plan = EXCLUDED.plan,
              billing = EXCLUDED.billing,
              email_verified_at = EXCLUDED.email_verified_at,
              password_changed_at = EXCLUDED.password_changed_at;
          `;
        } else if (collection === "businesses") {
          await tx`
            INSERT INTO public.businesses (
              id, user_id, name, type, tone, goals, created_at, updated_at
            ) VALUES (
              ${data.id}, ${data.userId}, ${data.name}, ${data.type || "other"}, ${data.tone || "professional"},
              ${data.goals || ["lead_follow_up"]}, ${data.createdAt}, ${data.updatedAt}
            ) ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              type = EXCLUDED.type,
              tone = EXCLUDED.tone,
              goals = EXCLUDED.goals,
              updated_at = EXCLUDED.updated_at;
          `;
        } else if (collection === "integrations") {
          await tx`
            INSERT INTO public.integrations (
              id, user_id, provider, status, encrypted_credentials, connected_email, created_at, updated_at
            ) VALUES (
              ${data.id}, ${data.userId}, ${data.provider}, ${data.status || "connected"},
              ${data.encryptedCredentials || null}, ${data.connectedEmail || null}, ${data.createdAt}, ${data.updatedAt}
            ) ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status,
              encrypted_credentials = EXCLUDED.encrypted_credentials,
              connected_email = EXCLUDED.connected_email,
              updated_at = EXCLUDED.updated_at;
          `;
        } else if (collection === "workflows") {
          await tx`
            INSERT INTO public.workflows (
              id, user_id, template_id, name, status, trigger_key, actions, runs, created_at, updated_at
            ) VALUES (
              ${data.id}, ${data.userId}, ${data.templateId || null}, ${data.name}, ${data.status || "active"},
              ${data.triggerKey}, ${data.actions ? tx.json(data.actions) : "[]"}::jsonb, ${data.runs || 0}, ${data.createdAt}, ${data.updatedAt}
            ) ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status,
              runs = EXCLUDED.runs,
              updated_at = EXCLUDED.updated_at;
          `;
        } else if (collection === "leads") {
          await tx`
            INSERT INTO public.leads (
              id, user_id, name, email, phone, message, source, status, created_at
            ) VALUES (
              ${data.id}, ${data.userId}, ${data.name}, ${data.email || null}, ${data.phone || null},
              ${data.message || ""}, ${data.source || "manual"}, ${data.status || "new"}, ${data.createdAt}
            ) ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status;
          `;
        } else if (collection === "approvals") {
          await tx`
            INSERT INTO public.approvals (
              id, user_id, lead_id, status, kind, draft, ai_provider, delivery_provider, created_at, resolved_at
            ) VALUES (
              ${data.id}, ${data.userId}, ${data.leadId}, ${data.status || "pending"}, ${data.kind || "follow_up_draft"},
              ${data.draft || null}, ${data.aiProvider || null}, ${data.deliveryProvider || null}, ${data.createdAt}, ${data.resolvedAt || null}
            ) ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status,
              draft = EXCLUDED.draft,
              resolved_at = EXCLUDED.resolved_at;
          `;
        } else if (collection === "activity") {
          await tx`
            INSERT INTO public.activity_logs (
              id, user_id, type, label, source, status, created_at
            ) VALUES (
              ${data.id}, ${data.userId}, ${data.type}, ${data.label}, ${data.source || "system"}, ${data.status || "success"}, ${data.createdAt}
            ) ON CONFLICT (id) DO NOTHING;
          `;
        } else if (collection === "processedWebhookEvents") {
          // data for processedWebhookEvents is direct string or object with value
          const value = typeof data === "string" ? data : data.value || data.id;
          await tx`
            INSERT INTO public.processed_webhook_events (
              value, processed_at
            ) VALUES (
              ${value}, NOW()
            ) ON CONFLICT (value) DO NOTHING;
          `;
        } else if (collection === "authTokens") {
          await tx`
            INSERT INTO public.auth_tokens (
              id, user_id, kind, token_hash, expires_at, created_at, used_at
            ) VALUES (
              ${data.id}, ${data.userId}, ${data.kind}, ${data.tokenHash}, ${data.expiresAt}, ${data.createdAt}, ${data.usedAt || null}
            ) ON CONFLICT (id) DO UPDATE SET
              used_at = EXCLUDED.used_at;
          `;
        } else if (collection === "outbox") {
          await tx`
            INSERT INTO public.outbox (
              id, user_id, to_email, kind, status, link, created_at, sent_at
            ) VALUES (
              ${data.id}, ${data.userId}, ${data.toEmail || data.to}, ${data.kind}, ${data.status || "queued"},
              ${data.link || null}, ${data.createdAt}, ${data.sentAt || null}
            ) ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status,
              sent_at = EXCLUDED.sent_at;
          `;
        }
      }
    });

    console.log("✅ Data successfully migrated from legacy table to normalized schema.");
  } catch (err) {
    console.error("❌ Migration failed:");
    console.error(err);
    process.exit(1);
  } finally {
    await sql.end();
  }
})();
