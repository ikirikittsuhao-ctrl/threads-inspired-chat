-- Drop and recreate the conversations INSERT policy to fix RLS issues
DROP POLICY IF EXISTS conversations_insert ON public.conversations;
CREATE POLICY conversations_insert ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
