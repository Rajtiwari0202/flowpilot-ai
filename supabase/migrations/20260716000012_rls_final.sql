BEGIN;

-- Enable Row-Level Security (RLS) on all core tables
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_processed_messages ENABLE ROW LEVEL SECURITY;

-- Force RLS to ensure table owners obey the policies
ALTER TABLE public.leads FORCE ROW LEVEL SECURITY;
ALTER TABLE public.approvals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.workflows FORCE ROW LEVEL SECURITY;
ALTER TABLE public.integrations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_processed_messages FORCE ROW LEVEL SECURITY;

-- 1. Leads Tenant Isolation Policy
DROP POLICY IF EXISTS tenant_isolation_policy ON public.leads;
CREATE POLICY tenant_isolation_policy ON public.leads
  FOR ALL
  USING (workspace_id = current_setting('app.current_workspace_id', true))
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true));

-- 2. Approvals Tenant Isolation Policy
DROP POLICY IF EXISTS tenant_isolation_policy ON public.approvals;
CREATE POLICY tenant_isolation_policy ON public.approvals
  FOR ALL
  USING (workspace_id = current_setting('app.current_workspace_id', true))
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true));

-- 3. Workflows Tenant Isolation Policy
DROP POLICY IF EXISTS tenant_isolation_policy ON public.workflows;
CREATE POLICY tenant_isolation_policy ON public.workflows
  FOR ALL
  USING (workspace_id = current_setting('app.current_workspace_id', true))
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true));

-- 4. Integrations Tenant Isolation Policy
DROP POLICY IF EXISTS tenant_isolation_policy ON public.integrations;
CREATE POLICY tenant_isolation_policy ON public.integrations
  FOR ALL
  USING (workspace_id = current_setting('app.current_workspace_id', true))
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true));

-- 5. Notifications Tenant Isolation Policy
DROP POLICY IF EXISTS tenant_isolation_policy ON public.notifications;
CREATE POLICY tenant_isolation_policy ON public.notifications
  FOR ALL
  USING (workspace_id = current_setting('app.current_workspace_id', true))
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true));

-- 6. Workflow Runs Tenant Isolation Policy
DROP POLICY IF EXISTS tenant_isolation_policy ON public.workflow_runs;
CREATE POLICY tenant_isolation_policy ON public.workflow_runs
  FOR ALL
  USING (workspace_id = current_setting('app.current_workspace_id', true))
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true));

-- 7. Audit Logs Tenant Isolation Policy
DROP POLICY IF EXISTS tenant_isolation_policy ON public.audit_logs;
CREATE POLICY tenant_isolation_policy ON public.audit_logs
  FOR ALL
  USING (workspace_id = current_setting('app.current_workspace_id', true))
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true));

-- 8. Gmail Processed Messages Tenant Isolation Policy
DROP POLICY IF EXISTS tenant_isolation_policy ON public.gmail_processed_messages;
CREATE POLICY tenant_isolation_policy ON public.gmail_processed_messages
  FOR ALL
  USING (workspace_id = current_setting('app.current_workspace_id', true))
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true));

COMMIT;
