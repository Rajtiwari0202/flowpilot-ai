BEGIN;

-- Create workspace_ai_usage table for tracking usage stats
CREATE TABLE IF NOT EXISTS public.workspace_ai_usage (
  id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  prompt_tokens INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  total_tokens INT NOT NULL DEFAULT 0,
  request_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_workspace_ai_usage PRIMARY KEY (id),
  CONSTRAINT fk_workspace_ai_usage_workspace FOREIGN KEY (workspace_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

-- Optimize workspace analytics lookups
CREATE INDEX IF NOT EXISTS idx_workspace_ai_usage_workspace ON public.workspace_ai_usage USING btree (workspace_id);

COMMIT;
