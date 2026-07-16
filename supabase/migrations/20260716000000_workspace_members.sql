BEGIN;

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);

-- Safe backfill: Associate existing business workspaces with their respective owner users
INSERT INTO public.workspace_members (id, workspace_id, user_id, role, created_at, updated_at)
SELECT 
  'wmem_' || md5(id || user_id || 'wmem_salt'),
  id,
  user_id,
  'owner',
  NOW(),
  NOW()
FROM public.businesses
ON CONFLICT (workspace_id, user_id) DO NOTHING;

COMMIT;
