REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.is_conversation_member(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_conversation_creator(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;