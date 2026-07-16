BEGIN;

-- Add encryption_salt column to integrations table
ALTER TABLE public.integrations ADD COLUMN IF NOT EXISTS encryption_salt TEXT;

COMMIT;
