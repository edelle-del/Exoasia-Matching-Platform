-- Add project_id to cofounder_invites so invites can be tied to a specific project
ALTER TABLE public.cofounder_invites
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add project_id to cofounder_links so accepted links know which project they belong to
ALTER TABLE public.cofounder_links
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
