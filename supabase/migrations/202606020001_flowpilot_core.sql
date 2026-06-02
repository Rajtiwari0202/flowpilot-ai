create extension if not exists "pgcrypto";

create table if not exists public.flowpilot_records (
  collection text not null,
  record_id text not null,
  user_id text,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (collection, record_id)
);

create index if not exists flowpilot_records_collection_idx on public.flowpilot_records (collection);
create index if not exists flowpilot_records_user_idx on public.flowpilot_records (user_id);

create or replace function public.flowpilot_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists flowpilot_records_touch_updated_at on public.flowpilot_records;
create trigger flowpilot_records_touch_updated_at
before update on public.flowpilot_records
for each row execute function public.flowpilot_touch_updated_at();

alter table public.flowpilot_records enable row level security;

comment on table public.flowpilot_records is
  'Server-owned FlowPilot application records. Access is restricted to the backend database role.';
