BEGIN;

-- Create gmail_sync_state table for checkpoint tracking and idempotency validation
CREATE TABLE IF NOT EXISTS public.gmail_sync_state (
  workspace_id TEXT NOT NULL,
  last_history_id TEXT,
  last_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_message_ids TEXT[] DEFAULT '{}',
  processed_thread_ids TEXT[] DEFAULT '{}',
  CONSTRAINT pk_gmail_sync_state PRIMARY KEY (workspace_id),
  CONSTRAINT fk_gmail_sync_state_workspace FOREIGN KEY (workspace_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

-- Optimize queries matching workspace sync filters
CREATE INDEX IF NOT EXISTS idx_gmail_sync_state_workspace ON public.gmail_sync_state USING btree (workspace_id);

COMMIT;
