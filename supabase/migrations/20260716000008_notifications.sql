BEGIN;

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  user_id TEXT, -- Nullable so notification history remains if user is deleted
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_notifications PRIMARY KEY (id),
  CONSTRAINT fk_notifications_workspace FOREIGN KEY (workspace_id) REFERENCES public.businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT chk_notifications_type CHECK (
    type IN (
      'lead_created',
      'approval_required',
      'approval_approved',
      'approval_rejected',
      'workflow_failed',
      'integration_error',
      'system'
    )
  )
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_workspace_user_read ON public.notifications USING btree (workspace_id, user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_workspace_user_created ON public.notifications (workspace_id, user_id, created_at DESC);

COMMIT;
