BEGIN;

-- Add prompt_version and confidence columns to approvals table
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS prompt_version TEXT;
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS confidence NUMERIC;

COMMIT;
