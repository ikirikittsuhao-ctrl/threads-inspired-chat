-- 1) profiles: identity readable, bio protected by column privilege + RPC
DROP POLICY IF EXISTS profiles_visible_read ON public.profiles;
DROP POLICY IF EXISTS profiles_public_read ON public.profiles;

CREATE POLICY profiles_identity_read ON public.profiles
  FOR SELECT TO anon, authenticated USING (true);

REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, username, display_name, avatar_url, is_private, created_at, updated_at)
  ON public.profiles TO anon, authenticated;
GRANT SELECT ON public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.get_profile_bio(_profile_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p.is_private
     AND p.id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
     AND NOT EXISTS (
       SELECT 1 FROM public.follows f
       WHERE f.following_id = p.id AND f.follower_id = auth.uid()
     )
    THEN ''
    ELSE p.bio
  END
  FROM public.profiles p
  WHERE p.id = _profile_id
$$;

REVOKE ALL ON FUNCTION public.get_profile_bio(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_bio(uuid) TO anon, authenticated, service_role;

-- 2) push subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_subs_own ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();