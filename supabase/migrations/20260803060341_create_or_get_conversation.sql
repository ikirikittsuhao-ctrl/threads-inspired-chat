-- SECURITY DEFINER function to create or get a 1:1 conversation
-- Direct INSERT into conversations fails via PostgREST RLS even when
-- created_by = auth.uid() (RLS WITH CHECK evaluates before column defaults
-- in some PostgREST versions), so we wrap the insert in a SECURITY DEFINER
-- function that runs as the owner and bypasses RLS.

CREATE OR REPLACE FUNCTION public.create_or_get_conversation(other_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_viewer_id uuid := auth.uid();
  v_conversation_id uuid;
BEGIN
  IF v_viewer_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_viewer_id = other_user_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;

  -- Check if a conversation already exists between these two users
  SELECT c.id INTO v_conversation_id
  FROM public.conversations c
  WHERE EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = c.id AND cm.user_id = v_viewer_id
  ) AND EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = c.id AND cm.user_id = other_user_id
  )
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Create new conversation
  INSERT INTO public.conversations (created_by) VALUES (v_viewer_id) RETURNING id INTO v_conversation_id;

  -- Add both members
  INSERT INTO public.conversation_members (conversation_id, user_id) VALUES
    (v_conversation_id, v_viewer_id),
    (v_conversation_id, other_user_id);

  RETURN v_conversation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_or_get_conversation(uuid) TO authenticated;
