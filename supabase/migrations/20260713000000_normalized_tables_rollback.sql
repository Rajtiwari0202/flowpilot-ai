-- Rollback migrations: Drop newly created normalized tables

DROP TABLE IF EXISTS public.outbox CASCADE;
DROP TABLE IF EXISTS public.auth_tokens CASCADE;
DROP TABLE IF EXISTS public.processed_webhook_events CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.approvals CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.workflows CASCADE;
DROP TABLE IF EXISTS public.workflow_templates CASCADE;
DROP TABLE IF EXISTS public.integrations CASCADE;
DROP TABLE IF EXISTS public.businesses CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
