BEGIN;

-- Add Leads V2 columns (fully additive and nullable)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_to TEXT;

-- Add assigned_to foreign key pointing to users(id) ON DELETE SET NULL
ALTER TABLE public.leads ADD CONSTRAINT fk_leads_assigned_to FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;

-- Create indexes for performance tuning on search/filter fields
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads USING btree (assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_tags ON public.leads USING gin (tags);

COMMIT;
