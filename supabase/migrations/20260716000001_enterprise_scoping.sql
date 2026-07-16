BEGIN;

-- Add workspace_id column (fully additive, nullable) to existing tables
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS workspace_id TEXT;
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS workspace_id TEXT;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS workspace_id TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS workspace_id TEXT;
ALTER TABLE public.integrations ADD COLUMN IF NOT EXISTS workspace_id TEXT;

-- Add safe RESTRICT or SET NULL foreign keys pointing to businesses(id)
ALTER TABLE public.leads ADD CONSTRAINT fk_leads_workspace FOREIGN KEY (workspace_id) REFERENCES public.businesses(id) ON DELETE RESTRICT;
ALTER TABLE public.approvals ADD CONSTRAINT fk_approvals_workspace FOREIGN KEY (workspace_id) REFERENCES public.businesses(id) ON DELETE RESTRICT;
ALTER TABLE public.workflows ADD CONSTRAINT fk_workflows_workspace FOREIGN KEY (workspace_id) REFERENCES public.businesses(id) ON DELETE RESTRICT;
ALTER TABLE public.integrations ADD CONSTRAINT fk_integrations_workspace FOREIGN KEY (workspace_id) REFERENCES public.businesses(id) ON DELETE RESTRICT;

ALTER TABLE public.activity_logs ADD CONSTRAINT fk_activity_logs_workspace FOREIGN KEY (workspace_id) REFERENCES public.businesses(id) ON DELETE SET NULL;

-- Backfill data: Associate workspace_id based on user_id -> business mapping
UPDATE public.leads l SET workspace_id = (SELECT id FROM public.businesses b WHERE b.user_id = l.user_id) WHERE workspace_id IS NULL;
UPDATE public.approvals a SET workspace_id = (SELECT id FROM public.businesses b WHERE b.user_id = a.user_id) WHERE workspace_id IS NULL;
UPDATE public.workflows w SET workspace_id = (SELECT id FROM public.businesses b WHERE b.user_id = w.user_id) WHERE workspace_id IS NULL;
UPDATE public.integrations i SET workspace_id = (SELECT id FROM public.businesses b WHERE b.user_id = i.user_id) WHERE workspace_id IS NULL;
UPDATE public.activity_logs al SET workspace_id = (SELECT id FROM public.businesses b WHERE b.user_id = al.user_id) WHERE workspace_id IS NULL;

-- Create single & compound B-Tree indexes for fast scoping
CREATE INDEX IF NOT EXISTS idx_leads_workspace ON public.leads USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS idx_leads_workspace_created ON public.leads USING btree (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_workspace_status ON public.leads USING btree (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_approvals_workspace ON public.approvals USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS idx_approvals_workspace_status ON public.approvals USING btree (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_workflows_workspace ON public.workflows USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace ON public.activity_logs USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS idx_integrations_workspace ON public.integrations USING btree (workspace_id);

COMMIT;
