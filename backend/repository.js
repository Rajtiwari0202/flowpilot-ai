const fs = require("fs");

const COLLECTIONS = [
  "users",
  "businesses",
  "integrations",
  "templates",
  "workflows",
  "leads",
  "activity",
  "approvals",
  "processedWebhookEvents",
  "authTokens",
  "outbox",
  "historicalAnalytics"
];

function emptyStore() {
  return Object.fromEntries(
    COLLECTIONS.map((collection) => [collection, []])
  );
}

function normalizeStore(store) {
  const normalized = emptyStore();

  for (const collection of COLLECTIONS) {
    normalized[collection] = Array.isArray(store[collection])
      ? store[collection]
      : [];
  }

  return normalized;
}

function createLocalRepository({ seedStorePath, storePath }) {
  return {
    mode: "local_json",

    async read() {
      if (!fs.existsSync(storePath)) {
        fs.copyFileSync(seedStorePath, storePath);
      }

      return normalizeStore(
        JSON.parse(fs.readFileSync(storePath, "utf8"))
      );
    },

    async write(store) {
      fs.writeFileSync(
        storePath,
        JSON.stringify(normalizeStore(store), null, 2)
      );
    },

    async close() {}
  };
}

// Mapping helper functions
function mapUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    passwordHash: u.password_hash,
    emailVerified: u.email_verified,
    googleId: u.google_id,
    plan: u.plan,
    billing: u.billing,
    createdAt: u.created_at ? new Date(u.created_at).toISOString() : null,
    emailVerifiedAt: u.email_verified_at ? new Date(u.email_verified_at).toISOString() : null,
    passwordChangedAt: u.password_changed_at ? new Date(u.password_changed_at).toISOString() : null
  };
}

function mapBusiness(b) {
  return {
    id: b.id,
    userId: b.user_id,
    name: b.name,
    type: b.type,
    tone: b.tone,
    goals: b.goals || [],
    createdAt: b.created_at ? new Date(b.created_at).toISOString() : null,
    updatedAt: b.updated_at ? new Date(b.updated_at).toISOString() : null
  };
}

function mapIntegration(i) {
  return {
    id: i.id,
    userId: i.user_id,
    provider: i.provider,
    status: i.status,
    encryptedCredentials: i.encrypted_credentials,
    connectedEmail: i.connected_email,
    createdAt: i.created_at ? new Date(i.created_at).toISOString() : null,
    updatedAt: i.updated_at ? new Date(i.updated_at).toISOString() : null
  };
}

function mapTemplate(t) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    recommended: t.recommended || false,
    triggerKey: t.trigger_key,
    actions: t.actions || []
  };
}

function mapWorkflow(w) {
  return {
    id: w.id,
    userId: w.user_id,
    templateId: w.template_id,
    name: w.name,
    status: w.status,
    triggerKey: w.trigger_key,
    actions: w.actions || [],
    runs: w.runs || 0,
    createdAt: w.created_at ? new Date(w.created_at).toISOString() : null,
    updatedAt: w.updated_at ? new Date(w.updated_at).toISOString() : null
  };
}

function mapLead(l) {
  return {
    id: l.id,
    userId: l.user_id,
    name: l.name,
    email: l.email,
    phone: l.phone,
    message: l.message,
    source: l.source,
    status: l.status,
    createdAt: l.created_at ? new Date(l.created_at).toISOString() : null
  };
}

function mapApproval(a) {
  return {
    id: a.id,
    userId: a.user_id,
    leadId: a.lead_id,
    status: a.status,
    kind: a.kind,
    draft: a.draft,
    aiProvider: a.ai_provider,
    deliveryProvider: a.delivery_provider,
    createdAt: a.created_at ? new Date(a.created_at).toISOString() : null,
    resolvedAt: a.resolved_at ? new Date(a.resolved_at).toISOString() : null
  };
}

function mapActivity(ac) {
  return {
    id: ac.id,
    userId: ac.user_id,
    type: ac.type,
    label: ac.label,
    source: ac.source,
    status: ac.status,
    createdAt: ac.created_at ? new Date(ac.created_at).toISOString() : null
  };
}

function mapAuthToken(at) {
  return {
    id: at.id,
    userId: at.user_id,
    kind: at.kind,
    tokenHash: at.token_hash,
    expiresAt: at.expires_at ? new Date(at.expires_at).toISOString() : null,
    createdAt: at.created_at ? new Date(at.created_at).toISOString() : null,
    usedAt: at.used_at ? new Date(at.used_at).toISOString() : null
  };
}

function mapOutbox(o) {
  return {
    id: o.id,
    userId: o.user_id,
    toEmail: o.to_email,
    to: o.to_email, // Preserve 'to' for compatibility
    kind: o.kind,
    status: o.status,
    link: o.link,
    createdAt: o.created_at ? new Date(o.created_at).toISOString() : null,
    sentAt: o.sent_at ? new Date(o.sent_at).toISOString() : null
  };
}

function mapHistoricalAnalytics(row) {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date ? new Date(row.date).toISOString().split('T')[0] : null,
    leadsCount: Number(row.leads_count || 0),
    approvalsCount: Number(row.approvals_count || 0),
    rejectionsCount: Number(row.rejections_count || 0),
    avgResponseTimeSeconds: Number(row.avg_response_time_seconds || 0),
    timeSavedMinutes: Number(row.time_saved_minutes || 0),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null
  };
}

function createPostgresRepository({ databaseUrl, seedStorePath }) {
  const postgres = require("postgres");
  const connectionUrl = new URL(databaseUrl);

  if (!connectionUrl.pathname || connectionUrl.pathname === "/") {
    connectionUrl.pathname = "/postgres";
  }

  const sql = postgres(connectionUrl.toString(), {
    ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
    max: Number(process.env.DATABASE_POOL_SIZE || 5),
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false // Required for Supabase PgBouncer
  });

  let connectionVerified = false;

  async function ensureConnection() {
    if (connectionVerified) return;
    try {
      await sql`select 1 as connected`;
      connectionVerified = true;
      console.log("✅ PostgreSQL connection established");
    } catch (error) {
      console.error("❌ PostgreSQL connection failed");
      console.error(error);
      throw error;
    }
  }

  async function write(store) {
    await ensureConnection();
    const normalized = normalizeStore(store);

    await sql.begin(async (tx) => {
      // 1. Sync users
      const currentUsers = await tx`SELECT id FROM public.users`;
      const currentUserIds = new Set(currentUsers.map(r => r.id));
      const newUserIds = new Set(normalized.users.map(item => item.id));

      for (const item of normalized.users) {
        if (currentUserIds.has(item.id)) {
          await tx`
            UPDATE public.users SET
              name = ${item.name},
              email = ${item.email},
              password_hash = ${item.passwordHash || null},
              email_verified = ${item.emailVerified || false},
              google_id = ${item.googleId || null},
              plan = ${item.plan || "free"},
              billing = ${item.billing ? tx.json(item.billing) : null},
              email_verified_at = ${item.emailVerifiedAt || null},
              password_changed_at = ${item.passwordChangedAt || null}
            WHERE id = ${item.id}
          `;
        } else {
          await tx`
            INSERT INTO public.users (
              id, name, email, password_hash, email_verified, google_id, plan, billing, created_at, email_verified_at, password_changed_at
            ) VALUES (
              ${item.id}, ${item.name}, ${item.email}, ${item.passwordHash || null}, ${item.emailVerified || false},
              ${item.googleId || null}, ${item.plan || "free"}, ${item.billing ? tx.json(item.billing) : null},
              ${item.createdAt}, ${item.emailVerifiedAt || null}, ${item.passwordChangedAt || null}
            )
          `;
        }
      }
      for (const id of currentUserIds) {
        if (!newUserIds.has(id)) {
          await tx`DELETE FROM public.users WHERE id = ${id}`;
        }
      }

      // 2. Sync businesses
      const currentBiz = await tx`SELECT id FROM public.businesses`;
      const currentBizIds = new Set(currentBiz.map(r => r.id));
      const newBizIds = new Set(normalized.businesses.map(item => item.id));

      for (const item of normalized.businesses) {
        if (currentBizIds.has(item.id)) {
          await tx`
            UPDATE public.businesses SET
              user_id = ${item.userId},
              name = ${item.name},
              type = ${item.type || "other"},
              tone = ${item.tone || "professional"},
              goals = ${item.goals || ["lead_follow_up"]},
              updated_at = ${item.updatedAt}
            WHERE id = ${item.id}
          `;
        } else {
          await tx`
            INSERT INTO public.businesses (
              id, user_id, name, type, tone, goals, created_at, updated_at
            ) VALUES (
              ${item.id}, ${item.userId}, ${item.name}, ${item.type || "other"}, ${item.tone || "professional"},
              ${item.goals || ["lead_follow_up"]}, ${item.createdAt}, ${item.updatedAt}
            )
          `;
        }
      }
      for (const id of currentBizIds) {
        if (!newBizIds.has(id)) {
          await tx`DELETE FROM public.businesses WHERE id = ${id}`;
        }
      }

      // 3. Sync integrations
      const currentInt = await tx`SELECT id FROM public.integrations`;
      const currentIntIds = new Set(currentInt.map(r => r.id));
      const newIntIds = new Set(normalized.integrations.map(item => item.id));

      for (const item of normalized.integrations) {
        if (currentIntIds.has(item.id)) {
          await tx`
            UPDATE public.integrations SET
              user_id = ${item.userId},
              provider = ${item.provider},
              status = ${item.status || "connected"},
              encrypted_credentials = ${item.encryptedCredentials || null},
              connected_email = ${item.connectedEmail || null},
              updated_at = ${item.updatedAt}
            WHERE id = ${item.id}
          `;
        } else {
          await tx`
            INSERT INTO public.integrations (
              id, user_id, provider, status, encrypted_credentials, connected_email, created_at, updated_at
            ) VALUES (
              ${item.id}, ${item.userId}, ${item.provider}, ${item.status || "connected"},
              ${item.encryptedCredentials || null}, ${item.connectedEmail || null}, ${item.createdAt}, ${item.updatedAt}
            )
          `;
        }
      }
      for (const id of currentIntIds) {
        if (!newIntIds.has(id)) {
          await tx`DELETE FROM public.integrations WHERE id = ${id}`;
        }
      }

      // 4. Sync templates
      const currentTpl = await tx`SELECT id FROM public.workflow_templates`;
      const currentTplIds = new Set(currentTpl.map(r => r.id));
      const newTplIds = new Set(normalized.templates.map(item => item.id));

      for (const item of normalized.templates) {
        if (currentTplIds.has(item.id)) {
          await tx`
            UPDATE public.workflow_templates SET
              title = ${item.title},
              description = ${item.description},
              category = ${item.category},
              recommended = ${item.recommended || false},
              trigger_key = ${item.triggerKey},
              actions = ${item.actions ? tx.json(item.actions) : "[]"}::jsonb
            WHERE id = ${item.id}
          `;
        } else {
          await tx`
            INSERT INTO public.workflow_templates (
              id, title, description, category, recommended, trigger_key, actions
            ) VALUES (
              ${item.id}, ${item.title}, ${item.description}, ${item.category}, ${item.recommended || false},
              ${item.triggerKey}, ${item.actions ? tx.json(item.actions) : "[]"}::jsonb
            )
          `;
        }
      }
      for (const id of currentTplIds) {
        if (!newTplIds.has(id)) {
          await tx`DELETE FROM public.workflow_templates WHERE id = ${id}`;
        }
      }

      // 5. Sync workflows
      const currentWf = await tx`SELECT id FROM public.workflows`;
      const currentWfIds = new Set(currentWf.map(r => r.id));
      const newWfIds = new Set(normalized.workflows.map(item => item.id));

      for (const item of normalized.workflows) {
        if (currentWfIds.has(item.id)) {
          await tx`
            UPDATE public.workflows SET
              user_id = ${item.userId},
              template_id = ${item.templateId || null},
              name = ${item.name},
              status = ${item.status || "active"},
              trigger_key = ${item.triggerKey},
              actions = ${item.actions ? tx.json(item.actions) : "[]"}::jsonb,
              runs = ${item.runs || 0},
              updated_at = ${item.updatedAt}
            WHERE id = ${item.id}
          `;
        } else {
          await tx`
            INSERT INTO public.workflows (
              id, user_id, template_id, name, status, trigger_key, actions, runs, created_at, updated_at
            ) VALUES (
              ${item.id}, ${item.userId}, ${item.templateId || null}, ${item.name}, ${item.status || "active"},
              ${item.triggerKey}, ${item.actions ? tx.json(item.actions) : "[]"}::jsonb, ${item.runs || 0}, ${item.createdAt}, ${item.updatedAt}
            )
          `;
        }
      }
      for (const id of currentWfIds) {
        if (!newWfIds.has(id)) {
          await tx`DELETE FROM public.workflows WHERE id = ${id}`;
        }
      }

      // 6. Sync leads
      const currentLeads = await tx`SELECT id FROM public.leads`;
      const currentLeadIds = new Set(currentLeads.map(r => r.id));
      const newLeadIds = new Set(normalized.leads.map(item => item.id));

      for (const item of normalized.leads) {
        if (currentLeadIds.has(item.id)) {
          await tx`
            UPDATE public.leads SET
              user_id = ${item.userId},
              name = ${item.name},
              email = ${item.email || null},
              phone = ${item.phone || null},
              message = ${item.message || ""},
              source = ${item.source || "manual"},
              status = ${item.status || "new"}
            WHERE id = ${item.id}
          `;
        } else {
          await tx`
            INSERT INTO public.leads (
              id, user_id, name, email, phone, message, source, status, created_at
            ) VALUES (
              ${item.id}, ${item.userId}, ${item.name}, ${item.email || null}, ${item.phone || null},
              ${item.message || ""}, ${item.source || "manual"}, ${item.status || "new"}, ${item.createdAt}
            )
          `;
        }
      }
      for (const id of currentLeadIds) {
        if (!newLeadIds.has(id)) {
          await tx`DELETE FROM public.leads WHERE id = ${id}`;
        }
      }

      // 7. Sync approvals
      const currentAppr = await tx`SELECT id FROM public.approvals`;
      const currentApprIds = new Set(currentAppr.map(r => r.id));
      const newApprIds = new Set(normalized.approvals.map(item => item.id));

      for (const item of normalized.approvals) {
        if (currentApprIds.has(item.id)) {
          await tx`
            UPDATE public.approvals SET
              user_id = ${item.userId},
              lead_id = ${item.leadId},
              status = ${item.status || "pending"},
              kind = ${item.kind || "follow_up_draft"},
              draft = ${item.draft || null},
              ai_provider = ${item.aiProvider || null},
              delivery_provider = ${item.deliveryProvider || null},
              resolved_at = ${item.resolvedAt || null}
            WHERE id = ${item.id}
          `;
        } else {
          await tx`
            INSERT INTO public.approvals (
              id, user_id, lead_id, status, kind, draft, ai_provider, delivery_provider, created_at, resolved_at
            ) VALUES (
              ${item.id}, ${item.userId}, ${item.leadId}, ${item.status || "pending"}, ${item.kind || "follow_up_draft"},
              ${item.draft || null}, ${item.aiProvider || null}, ${item.deliveryProvider || null}, ${item.createdAt}, ${item.resolvedAt || null}
            )
          `;
        }
      }
      for (const id of currentApprIds) {
        if (!newApprIds.has(id)) {
          await tx`DELETE FROM public.approvals WHERE id = ${id}`;
        }
      }

      // 8. Sync activity logs
      const currentAct = await tx`SELECT id FROM public.activity_logs`;
      const currentActIds = new Set(currentAct.map(r => r.id));
      const newActIds = new Set(normalized.activity.map(item => item.id));

      for (const item of normalized.activity) {
        if (currentActIds.has(item.id)) {
          await tx`
            UPDATE public.activity_logs SET
              user_id = ${item.userId},
              type = ${item.type},
              label = ${item.label},
              source = ${item.source || "system"},
              status = ${item.status || "success"}
            WHERE id = ${item.id}
          `;
        } else {
          await tx`
            INSERT INTO public.activity_logs (
              id, user_id, type, label, source, status, created_at
            ) VALUES (
              ${item.id}, ${item.userId}, ${item.type}, ${item.label}, ${item.source || "system"}, ${item.status || "success"}, ${item.createdAt}
            )
          `;
        }
      }
      for (const id of currentActIds) {
        if (!newActIds.has(id)) {
          await tx`DELETE FROM public.activity_logs WHERE id = ${id}`;
        }
      }

      // 9. Sync webhook events
      const currentWebhooks = await tx`SELECT value FROM public.processed_webhook_events`;
      const currentWebhookValues = new Set(currentWebhooks.map(r => r.value));
      const newWebhookValues = new Set(normalized.processedWebhookEvents.map(v => typeof v === "string" ? v : v.value || v.id));

      for (const val of newWebhookValues) {
        if (!currentWebhookValues.has(val)) {
          await tx`
            INSERT INTO public.processed_webhook_events (
              value, processed_at
            ) VALUES (
              ${val}, NOW()
            )
          `;
        }
      }
      for (const val of currentWebhookValues) {
        if (!newWebhookValues.has(val)) {
          await tx`DELETE FROM public.processed_webhook_events WHERE value = ${val}`;
        }
      }

      // 10. Sync auth tokens
      const currentTok = await tx`SELECT id FROM public.auth_tokens`;
      const currentTokIds = new Set(currentTok.map(r => r.id));
      const newTokIds = new Set(normalized.authTokens.map(item => item.id));

      for (const item of normalized.authTokens) {
        if (currentTokIds.has(item.id)) {
          await tx`
            UPDATE public.auth_tokens SET
              user_id = ${item.userId},
              kind = ${item.kind},
              token_hash = ${item.tokenHash},
              expires_at = ${item.expiresAt},
              used_at = ${item.usedAt || null}
            WHERE id = ${item.id}
          `;
        } else {
          await tx`
            INSERT INTO public.auth_tokens (
              id, user_id, kind, token_hash, expires_at, created_at, used_at
            ) VALUES (
              ${item.id}, ${item.userId}, ${item.kind}, ${item.tokenHash}, ${item.expiresAt}, ${item.createdAt}, ${item.usedAt || null}
            )
          `;
        }
      }
      for (const id of currentTokIds) {
        if (!newTokIds.has(id)) {
          await tx`DELETE FROM public.auth_tokens WHERE id = ${id}`;
        }
      }

      // 11. Sync outbox
      const currentOutbox = await tx`SELECT id FROM public.outbox`;
      const currentOutboxIds = new Set(currentOutbox.map(r => r.id));
      const newOutboxIds = new Set(normalized.outbox.map(item => item.id));

      for (const item of normalized.outbox) {
        if (currentOutboxIds.has(item.id)) {
          await tx`
            UPDATE public.outbox SET
              user_id = ${item.userId},
              to_email = ${item.toEmail || item.to},
              kind = ${item.kind},
              status = ${item.status || "queued"},
              link = ${item.link || null},
              sent_at = ${item.sentAt || null}
            WHERE id = ${item.id}
          `;
        } else {
          await tx`
            INSERT INTO public.outbox (
              id, user_id, to_email, kind, status, link, created_at, sent_at
            ) VALUES (
              ${item.id}, ${item.userId}, ${item.toEmail || item.to}, ${item.kind}, ${item.status || "queued"},
              ${item.link || null}, ${item.createdAt}, ${item.sentAt || null}
            )
          `;
        }
      }
      for (const id of currentOutboxIds) {
        if (!newOutboxIds.has(id)) {
          await tx`DELETE FROM public.outbox WHERE id = ${id}`;
        }
      }

      // 12. Sync historicalAnalytics
      const currentAnalytics = await tx`SELECT id FROM public.historical_analytics`;
      const currentAnalyticsIds = new Set(currentAnalytics.map(r => r.id));
      const newAnalyticsIds = new Set(normalized.historicalAnalytics.map(item => item.id));

      for (const item of normalized.historicalAnalytics) {
        if (currentAnalyticsIds.has(item.id)) {
          await tx`
            UPDATE public.historical_analytics SET
              user_id = ${item.userId},
              date = ${item.date},
              leads_count = ${item.leadsCount},
              approvals_count = ${item.approvalsCount},
              rejections_count = ${item.rejectionsCount},
              avg_response_time_seconds = ${item.avgResponseTimeSeconds},
              time_saved_minutes = ${item.timeSavedMinutes},
              created_at = ${item.createdAt}
            WHERE id = ${item.id}
          `;
        } else {
          await tx`
            INSERT INTO public.historical_analytics (
              id, user_id, date, leads_count, approvals_count, rejections_count, avg_response_time_seconds, time_saved_minutes, created_at
            ) VALUES (
              ${item.id}, ${item.userId}, ${item.date}, ${item.leadsCount}, ${item.approvalsCount}, ${item.rejectionsCount}, ${item.avgResponseTimeSeconds}, ${item.timeSavedMinutes}, ${item.createdAt}
            )
          `;
        }
      }
      for (const id of currentAnalyticsIds) {
        if (!newAnalyticsIds.has(id)) {
          await tx`DELETE FROM public.historical_analytics WHERE id = ${id}`;
        }
      }
    });
  }

  return {
    mode: "supabase_postgres",

    async read() {
      await ensureConnection();

      // Read from all 12 tables concurrently
      const [
        users,
        businesses,
        integrations,
        templates,
        workflows,
        leads,
        approvals,
        activity,
        webhookEvents,
        tokens,
        outbox,
        analytics
      ] = await Promise.all([
        sql`SELECT * FROM public.users ORDER BY created_at ASC`,
        sql`SELECT * FROM public.businesses ORDER BY created_at ASC`,
        sql`SELECT * FROM public.integrations ORDER BY created_at ASC`,
        sql`SELECT * FROM public.workflow_templates`,
        sql`SELECT * FROM public.workflows ORDER BY created_at ASC`,
        sql`SELECT * FROM public.leads ORDER BY created_at ASC`,
        sql`SELECT * FROM public.approvals ORDER BY created_at ASC`,
        sql`SELECT * FROM public.activity_logs ORDER BY created_at ASC`,
        sql`SELECT * FROM public.processed_webhook_events ORDER BY processed_at ASC`,
        sql`SELECT * FROM public.auth_tokens ORDER BY created_at ASC`,
        sql`SELECT * FROM public.outbox ORDER BY created_at ASC`,
        sql`SELECT * FROM public.historical_analytics ORDER BY date ASC`
      ]);

      if (!users.length) {
        console.log("🌱 No records found in normalized DB, seeding database...");
        const seed = normalizeStore(
          JSON.parse(
            fs.readFileSync(seedStorePath, "utf8")
          )
        );
        await write(seed);
        return seed;
      }

      const store = emptyStore();
      store.users = users.map(mapUser);
      store.businesses = businesses.map(mapBusiness);
      store.integrations = integrations.map(mapIntegration);
      store.templates = templates.map(mapTemplate);
      store.workflows = workflows.map(mapWorkflow);
      store.leads = leads.map(mapLead);
      store.approvals = approvals.map(mapApproval);
      store.activity = activity.map(mapActivity);
      store.processedWebhookEvents = webhookEvents.map(row => row.value);
      store.authTokens = tokens.map(mapAuthToken);
      store.outbox = outbox.map(mapOutbox);
      store.historicalAnalytics = analytics.map(mapHistoricalAnalytics);

      return store;
    },

    write,

    async close() {
      await sql.end();
    }
  };
}

function createRepository({ seedStorePath, storePath }) {
  if (process.env.DATABASE_URL) {
    return createPostgresRepository({
      databaseUrl: process.env.DATABASE_URL,
      seedStorePath
    });
  }

  return createLocalRepository({
    seedStorePath,
    storePath
  });
}

module.exports = {
  COLLECTIONS,
  createRepository,
  emptyStore,
  normalizeStore
};