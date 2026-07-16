BEGIN;

-- Create the gmail_processed_messages normalized table
CREATE TABLE IF NOT EXISTS public.gmail_processed_messages (
  message_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_gmail_processed_messages PRIMARY KEY (message_id)
);

-- Index the workspace foreign key for performance
CREATE INDEX IF NOT EXISTS idx_gmail_processed_messages_workspace ON public.gmail_processed_messages (workspace_id);

COMMIT;
