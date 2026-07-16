-- RLS_VALIDATION.sql
-- Enterprise-grade database security checks for Row-Level Security verification.

-- 1. Verify FORCE RLS is active on core tables
SELECT
    schemaname,
    tablename,
    rowsecurity,
    forcerowsecurity
FROM pg_tables
JOIN pg_class ON pg_class.relname = pg_tables.tablename
WHERE schemaname = 'public';

-- 2. Verify all active security policies
SELECT *
FROM pg_policies
WHERE schemaname = 'public';

-- 3. Verify role bypass permissions
SELECT rolname, rolbypassrls 
FROM pg_roles 
WHERE rolname IN ('postgres', 'flowpilot_app', 'flowpilot_worker');

-- 4. Verify context-bound workspace isolation checks
-- (A) Unset workspace context variable (Expected: NULL)
SELECT current_setting('app.current_workspace_id', true);

-- (B) Populate session parameter
SET app.current_workspace_id = 'workspace_a';
SELECT current_setting('app.current_workspace_id', true); -- Expected: workspace_a

-- (C) Assert negative cross-tenant read prevention
-- Queries matching other tenant keys must return 0 rows
SELECT *
FROM public.leads
WHERE workspace_id = 'workspace_b'; -- Expected: 0 rows
