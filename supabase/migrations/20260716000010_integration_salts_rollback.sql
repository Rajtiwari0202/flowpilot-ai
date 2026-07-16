BEGIN;

ALTER TABLE public.integrations DROP COLUMN IF EXISTS encryption_salt;

COMMIT;
