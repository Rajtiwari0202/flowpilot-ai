BEGIN;

-- Create audit_logs table with actor_type
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  actor_id TEXT, -- Nullable to allow system-generated events
  actor_type TEXT NOT NULL DEFAULT 'user', -- user, system, workflow
  entity_type TEXT NOT NULL, -- e.g. lead, workflow, approval, integration
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL, -- e.g. lead.updated, workflow.created, approval.approved
  before_state JSONB,
  after_state JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_audit_logs PRIMARY KEY (id),
  CONSTRAINT fk_audit_logs_workspace FOREIGN KEY (workspace_id) REFERENCES public.businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_created ON public.audit_logs (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_entity ON public.audit_logs (workspace_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_action ON public.audit_logs (workspace_id, action);

COMMIT;
