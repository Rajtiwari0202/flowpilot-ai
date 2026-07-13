-- Create normalized tables for FlowPilot AI

CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  google_id TEXT,
  plan TEXT DEFAULT 'free',
  billing JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_verified_at TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.businesses (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other',
  tone TEXT NOT NULL DEFAULT 'professional',
  goals TEXT[] NOT NULL DEFAULT ARRAY['lead_follow_up']::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.integrations (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'connected',
  encrypted_credentials TEXT,
  connected_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  recommended BOOLEAN DEFAULT FALSE,
  trigger_key TEXT NOT NULL,
  actions JSONB NOT NULL DEFAULT '[]'::JSONB
);

CREATE TABLE IF NOT EXISTS public.workflows (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  template_id TEXT REFERENCES public.workflow_templates(id),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  trigger_key TEXT NOT NULL,
  actions JSONB NOT NULL DEFAULT '[]'::JSONB,
  runs INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.leads (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  message TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'new',
  gmail_message_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.approvals (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  lead_id TEXT REFERENCES public.leads(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  kind TEXT NOT NULL DEFAULT 'follow_up_draft',
  draft TEXT,
  ai_provider TEXT,
  delivery_provider TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'system',
  status TEXT NOT NULL DEFAULT 'success',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
  value TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.auth_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.outbox (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Seed templates if not exists
INSERT INTO public.workflow_templates (id, title, description, category, recommended, trigger_key, actions)
VALUES
  ('tpl_lead_follow_up', 'Lead Follow-up', 'Automatically follow up with new leads and nurture relationships.', 'sales', true, 'lead.created', '["classify_lead","draft_reply","request_approval","send_email"]'),
  ('tpl_invoice_reminder', 'Invoice Reminder', 'Send automated invoice reminders and track payments easily.', 'payments', false, 'invoice.overdue', '["draft_reminder","send_email","log_activity"]'),
  ('tpl_support_triage', 'Support Triage', 'Automatically triage and assign support tickets to the right team.', 'support', false, 'message.received', '["classify_ticket","assign_owner","notify_team"]')
ON CONFLICT (id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);
CREATE INDEX IF NOT EXISTS businesses_user_id_idx ON public.businesses(user_id);
CREATE INDEX IF NOT EXISTS integrations_user_id_idx ON public.integrations(user_id);
CREATE INDEX IF NOT EXISTS workflows_user_id_idx ON public.workflows(user_id);
CREATE INDEX IF NOT EXISTS leads_user_id_idx ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS approvals_user_id_idx ON public.approvals(user_id);
CREATE INDEX IF NOT EXISTS approvals_lead_id_idx ON public.approvals(lead_id);
CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS auth_tokens_user_id_idx ON public.auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS auth_tokens_token_hash_idx ON public.auth_tokens(token_hash);
CREATE INDEX IF NOT EXISTS outbox_user_id_idx ON public.outbox(user_id);
