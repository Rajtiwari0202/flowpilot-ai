BEGIN;

-- Drop foreign keys
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS fk_leads_workspace;
ALTER TABLE public.approvals DROP CONSTRAINT IF EXISTS fk_approvals_workspace;
ALTER TABLE public.workflows DROP CONSTRAINT IF EXISTS fk_workflows_workspace;
ALTER TABLE public.activity_logs DROP CONSTRAINT IF EXISTS fk_activity_logs_workspace;
ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS fk_integrations_workspace;

-- Drop indexes
DROP INDEX IF EXISTS idx_leads_workspace;
DROP INDEX IF EXISTS idx_leads_workspace_created;
DROP INDEX IF EXISTS idx_leads_workspace_status;
DROP INDEX IF EXISTS idx_approvals_workspace;
DROP INDEX IF EXISTS idx_approvals_workspace_status;
DROP INDEX IF EXISTS idx_workflows_workspace;
DROP INDEX IF EXISTS idx_activity_logs_workspace;
DROP INDEX IF EXISTS idx_integrations_workspace;

-- Drop columns
ALTER TABLE public.leads DROP COLUMN IF EXISTS workspace_id CASCADE;
ALTER TABLE public.approvals DROP COLUMN IF EXISTS workspace_id CASCADE;
ALTER TABLE public.workflows DROP COLUMN IF EXISTS workspace_id CASCADE;
ALTER TABLE public.activity_logs DROP COLUMN IF EXISTS workspace_id CASCADE;
ALTER TABLE public.integrations DROP COLUMN IF EXISTS workspace_id CASCADE;

COMMIT;
