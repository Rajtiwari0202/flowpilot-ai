BEGIN;

-- Disable RLS on core tables
ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_processed_messages DISABLE ROW LEVEL SECURITY;

-- Disable FORCE RLS
ALTER TABLE public.leads NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.approvals NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.workflows NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.integrations NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notifications NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_processed_messages NO FORCE ROW LEVEL SECURITY;

-- Drop isolation policies
DROP POLICY IF EXISTS tenant_isolation_policy ON public.leads;
DROP POLICY IF EXISTS tenant_isolation_policy ON public.approvals;
DROP POLICY IF EXISTS tenant_isolation_policy ON public.workflows;
DROP POLICY IF EXISTS tenant_isolation_policy ON public.integrations;
DROP POLICY IF EXISTS tenant_isolation_policy ON public.notifications;
DROP POLICY IF EXISTS tenant_isolation_policy ON public.workflow_runs;
DROP POLICY IF EXISTS tenant_isolation_policy ON public.audit_logs;
DROP POLICY IF EXISTS tenant_isolation_policy ON public.gmail_processed_messages;

COMMIT;
