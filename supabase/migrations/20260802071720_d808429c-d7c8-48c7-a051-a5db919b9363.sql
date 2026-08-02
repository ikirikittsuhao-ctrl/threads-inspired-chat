-- conversations: track creator
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS created_by uuid;
UPDATE public.conversations c
SET created_by = (SELECT m.user_id FROM public.conversation_members m WHERE m.conversation_id = c.id LIMIT 1)
WHERE created_by IS NULL;
ALTER TABLE public.conversations ALTER COLUMN created_by SET DEFAULT auth.uid();

CREATE OR REPLACE FUNCTION public.is_conversation_creator(_conversation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversations WHERE id = _conversation_id AND created_by = _user_id)
$$;

DROP POLICY IF EXISTS conversations_insert ON public.conversations;
CREATE POLICY conversations_insert ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS cm_insert ON public.conversation_members;
CREATE POLICY cm_insert ON public.conversation_members
  FOR INSERT TO authenticated WITH CHECK (
    public.is_conversation_creator(conversation_id, auth.uid())
    OR public.is_conversation_member(conversation_id, auth.uid())
  );

-- likes: no self-likes
DROP POLICY IF EXISTS likes_insert_own ON public.likes;
CREATE POLICY likes_insert_own ON public.likes
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid())
  );

-- posts: no self-reposts, no duplicate reposts
DROP POLICY IF EXISTS posts_insert_own ON public.posts;
CREATE POLICY posts_insert_own ON public.posts
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND (
      repost_of_id IS NULL
      OR NOT EXISTS (SELECT 1 FROM public.posts p WHERE p.id = repost_of_id AND p.user_id = auth.uid())
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS posts_unique_repost
  ON public.posts (user_id, repost_of_id) WHERE repost_of_id IS NOT NULL;

-- notifications: no self-notifications, restricted types
DROP POLICY IF EXISTS notifications_insert ON public.notifications;
CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = actor_id
    AND user_id <> auth.uid()
    AND type IN ('like', 'reply', 'follow')
  );