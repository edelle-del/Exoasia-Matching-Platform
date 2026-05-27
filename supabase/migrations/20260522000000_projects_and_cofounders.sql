-- Projects, cofounder invites, and cofounder links

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  stage TEXT,
  sector TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can manage their projects" ON public.projects;
CREATE POLICY "Owner can manage their projects"
  ON public.projects FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Advisors can read all projects" ON public.projects;
CREATE POLICY "Advisors can read all projects"
  ON public.projects FOR SELECT
  USING (public.authorize('profiles.read'));

DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;
CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS paid_project_slots INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.cofounder_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  uid_type TEXT NOT NULL CHECK (uid_type IN ('email', 'phone')),
  uid_value TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

ALTER TABLE public.cofounder_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Inviter can manage their cofounder invites" ON public.cofounder_invites;
CREATE POLICY "Inviter can manage their cofounder invites"
  ON public.cofounder_invites FOR ALL
  USING (auth.uid() = inviter_id)
  WITH CHECK (auth.uid() = inviter_id);

DROP POLICY IF EXISTS "Advisors can read cofounder invites" ON public.cofounder_invites;
CREATE POLICY "Advisors can read cofounder invites"
  ON public.cofounder_invites FOR SELECT
  USING (public.authorize('profiles.read'));

CREATE TABLE IF NOT EXISTS public.cofounder_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cofounder_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (founder_profile_id, cofounder_profile_id)
);

ALTER TABLE public.cofounder_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can see their cofounder links" ON public.cofounder_links;
CREATE POLICY "Members can see their cofounder links"
  ON public.cofounder_links FOR SELECT
  USING (
    auth.uid() = founder_profile_id
    OR auth.uid() = cofounder_profile_id
    OR public.authorize('profiles.read')
  );

DROP POLICY IF EXISTS "Founders can create cofounder links" ON public.cofounder_links;
CREATE POLICY "Founders can create cofounder links"
  ON public.cofounder_links FOR INSERT
  WITH CHECK (auth.uid() = founder_profile_id);
