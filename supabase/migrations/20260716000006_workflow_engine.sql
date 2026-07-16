BEGIN;

-- Create workflow_runs table
CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  workflow_id TEXT NOT NULL,
  trigger_key TEXT NOT NULL,
  status TEXT NOT NULL, -- pending, running, completed, failed, retrying, cancelled
  attempt_count INT NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_workflow_runs PRIMARY KEY (id),
  CONSTRAINT fk_workflow_runs_workspace FOREIGN KEY (workspace_id) REFERENCES public.businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_workflow_runs_workflow FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE
);

-- Index for workspace retrieval and status filters
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workspace ON public.workflow_runs USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON public.workflow_runs USING btree (workflow_id);

-- Create approval_actions table
CREATE TABLE IF NOT EXISTS public.approval_actions (
  id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  approval_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL, -- approved, rejected, cancelled
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_approval_actions PRIMARY KEY (id),
  CONSTRAINT fk_approval_actions_workspace FOREIGN KEY (workspace_id) REFERENCES public.businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_approval_actions_approval FOREIGN KEY (approval_id) REFERENCES public.approvals(id) ON DELETE CASCADE,
  CONSTRAINT fk_approval_actions_actor FOREIGN KEY (actor_id) REFERENCES public.users(id)
);

-- Index for approval tracking
CREATE INDEX IF NOT EXISTS idx_approval_actions_workspace ON public.approval_actions USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_approval ON public.approval_actions USING btree (approval_id);

COMMIT;
