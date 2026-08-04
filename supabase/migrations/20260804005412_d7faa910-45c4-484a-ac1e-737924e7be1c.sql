CREATE OR REPLACE FUNCTION public.create_or_get_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

REVOKE ALL ON FUNCTION public.create_or_get_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_or_get_conversation(uuid) TO authenticated;