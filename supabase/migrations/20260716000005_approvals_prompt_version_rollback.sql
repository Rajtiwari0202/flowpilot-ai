BEGIN;

ALTER TABLE public.approvals DROP COLUMN IF EXISTS prompt_version;
ALTER TABLE public.approvals DROP COLUMN IF EXISTS confidence;

COMMIT;
