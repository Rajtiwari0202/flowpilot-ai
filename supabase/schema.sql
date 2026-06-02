-- FlowPilot AI MVP schema for Supabase/Postgres.
-- Run this in the Supabase SQL editor after creating a project.

create extension if not exists "pgcrypto";

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null default 'other',
  tone text not null default 'professional',
  goals text[] not null default array['lead_follow_up'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_templates (
  id text primary key,
  title text not null,
  description text not null,
  category text not null,
  recommended boolean not null default false,
  trigger_key text not null,
  actions jsonb not null default '[]'::jsonb
);

create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  template_id text references public.workflow_templates(id),
  name text not null,
  status text not null default 'active' check (status in ('active', 'paused')),
  trigger_key text not null,
  actions jsonb not null default '[]'::jsonb,
  runs integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  message text not null default '',
  source text not null default 'manual',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  kind text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  draft text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  label text not null,
  source text not null default 'system',
  status text not null default 'success',
  created_at timestamptz not null default now()
);

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  status text not null default 'connected',
  encrypted_credentials jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, provider)
);

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'razorpay',
  provider_subscription_id text not null unique,
  status text not null default 'created',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id text primary key,
  provider text not null,
  event_type text,
  processed_at timestamptz not null default now()
);

alter table public.businesses enable row level security;
alter table public.workflows enable row level security;
alter table public.leads enable row level security;
alter table public.approvals enable row level security;
alter table public.activity_logs enable row level security;
alter table public.integrations enable row level security;
alter table public.billing_subscriptions enable row level security;

create policy "Owners manage businesses" on public.businesses using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners manage workflows" on public.workflows using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners manage leads" on public.leads using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners manage approvals" on public.approvals using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners view activity" on public.activity_logs for select using (auth.uid() = owner_id);
create policy "Owners manage integrations" on public.integrations using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners view subscriptions" on public.billing_subscriptions for select using (auth.uid() = owner_id);

insert into public.workflow_templates (id, title, description, category, recommended, trigger_key, actions)
values
  ('tpl_lead_follow_up', 'Lead Follow-up', 'Automatically follow up with new leads and nurture relationships.', 'sales', true, 'lead.created', '["classify_lead","draft_reply","request_approval","send_email"]'),
  ('tpl_invoice_reminder', 'Invoice Reminder', 'Send automated invoice reminders and track payments easily.', 'payments', false, 'invoice.overdue', '["draft_reminder","send_email","log_activity"]'),
  ('tpl_support_triage', 'Support Triage', 'Automatically triage and assign support tickets to the right team.', 'support', false, 'message.received', '["classify_ticket","assign_owner","notify_team"]')
on conflict (id) do nothing;
