BEGIN;

-- Drop foreign key
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS fk_leads_assigned_to;

-- Drop indexes
DROP INDEX IF EXISTS idx_leads_assigned_to;
DROP INDEX IF EXISTS idx_leads_tags;

-- Drop columns
ALTER TABLE public.leads DROP COLUMN IF EXISTS notes CASCADE;
ALTER TABLE public.leads DROP COLUMN IF EXISTS tags CASCADE;
ALTER TABLE public.leads DROP COLUMN IF EXISTS assigned_to CASCADE;

COMMIT;
