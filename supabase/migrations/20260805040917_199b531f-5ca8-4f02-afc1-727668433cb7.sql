-- 1. Private schema for internal SECURITY DEFINER helpers (not exposed via the API)
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION private.is_conversation_member(_conversation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = _conversation_id AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION private.is_conversation_creator(_conversation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversations WHERE id = _conversation_id AND created_by = _user_id)
$$;

CREATE OR REPLACE FUNCTION private.can_view_profile(_target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _target
      AND (
        NOT p.is_private
        OR p.id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.follows f
          WHERE f.following_id = p.id AND f.follower_id = auth.uid()
        )
      )
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_conversation_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_conversation_creator(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_view_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_conversation_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_conversation_creator(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_view_profile(uuid) TO anon, authenticated, service_role;

-- 2. Re-point policies at the private helpers
DROP POLICY IF EXISTS conversations_member_read ON public.conversations;
DROP POLICY IF EXISTS conversations_member_update ON public.conversations;
CREATE POLICY conversations_member_read ON public.conversations FOR SELECT TO authenticated
  USING (private.is_conversation_member(id, auth.uid()));
CREATE POLICY conversations_member_update ON public.conversations FOR UPDATE TO authenticated
  USING (private.is_conversation_member(id, auth.uid()))
  WITH CHECK (private.is_conversation_member(id, auth.uid()));

DROP POLICY IF EXISTS cm_read ON public.conversation_members;
DROP POLICY IF EXISTS cm_insert ON public.conversation_members;
CREATE POLICY cm_read ON public.conversation_members FOR SELECT TO authenticated
  USING (private.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY cm_insert ON public.conversation_members FOR INSERT TO authenticated
  WITH CHECK (
    private.is_conversation_creator(conversation_id, auth.uid())
    OR private.is_conversation_member(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS messages_member_read ON public.messages;
DROP POLICY IF EXISTS messages_insert_member ON public.messages;
CREATE POLICY messages_member_read ON public.messages FOR SELECT TO authenticated
  USING (private.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY messages_insert_member ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND private.is_conversation_member(conversation_id, auth.uid()));

-- 3. Move the conversation RPC body into private; keep a SECURITY INVOKER wrapper in public
CREATE OR REPLACE FUNCTION private.create_or_get_conversation(other_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  convo_id uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF other_user_id IS NULL OR other_user_id = me THEN
    RAISE EXCEPTION 'invalid conversation partner';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = other_user_id) THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  SELECT cm.conversation_id INTO convo_id
  FROM public.conversation_members cm
  JOIN public.conversation_members cm2 ON cm2.conversation_id = cm.conversation_id
  WHERE cm.user_id = me AND cm2.user_id = other_user_id
  LIMIT 1;

  IF convo_id IS NOT NULL THEN
    RETURN convo_id;
  END IF;

  INSERT INTO public.conversations (created_by) VALUES (me) RETURNING id INTO convo_id;
  INSERT INTO public.conversation_members (conversation_id, user_id)
  VALUES (convo_id, me), (convo_id, other_user_id);

  RETURN convo_id;
END;
$$;
REVOKE ALL ON FUNCTION private.create_or_get_conversation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.create_or_get_conversation(uuid) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.create_or_get_conversation(uuid);
CREATE FUNCTION public.create_or_get_conversation(other_user_id uuid)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  SELECT private.create_or_get_conversation(other_user_id)
$$;
REVOKE ALL ON FUNCTION public.create_or_get_conversation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_or_get_conversation(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_conversation_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_conversation_creator(uuid, uuid);
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 4. Private profiles are no longer publicly readable
DROP POLICY IF EXISTS profiles_public_read ON public.profiles;
CREATE POLICY profiles_visible_read ON public.profiles FOR SELECT TO anon, authenticated
  USING (
    NOT is_private
    OR id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.follows f
      WHERE f.following_id = profiles.id AND f.follower_id = auth.uid()
    )
  );

-- 5. Storage: restrict media reads to viewers allowed to see the owner's profile
DROP POLICY IF EXISTS post_media_read ON storage.objects;
CREATE POLICY post_media_read ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'post-media'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
        AND private.can_view_profile(((storage.foldername(name))[1])::uuid)
      )
    )
  );
