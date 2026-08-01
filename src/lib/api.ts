import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
}

export interface PostBase {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  parent_id: string | null;
  repost_of_id: string | null;
  created_at: string;
  profiles: Profile | null;
}

export interface Post extends PostBase {
  like_count: number;
  reply_count: number;
  liked: boolean;
  repost_of: PostBase | null;
}

const POST_SELECT =
  "id,user_id,content,image_url,parent_id,repost_of_id,created_at,profiles!posts_profile_fk(id,username,display_name,bio,avatar_url)";

async function enrich(rows: PostBase[], viewerId: string | null): Promise<Post[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const repostIds = rows.map((r) => r.repost_of_id).filter((v): v is string => Boolean(v));

  const [likesRes, repliesRes, repostRes] = await Promise.all([
    supabase.from("likes").select("post_id,user_id").in("post_id", ids),
    supabase.from("posts").select("parent_id").in("parent_id", ids),
    repostIds.length
      ? supabase.from("posts").select(POST_SELECT).in("id", repostIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const likes = (likesRes.data ?? []) as { post_id: string; user_id: string }[];
  const replies = (repliesRes.data ?? []) as { parent_id: string | null }[];
  const reposts = ((repostRes as { data: unknown[] }).data ?? []) as unknown as PostBase[];

  return rows.map((row) => ({
    ...row,
    like_count: likes.filter((l) => l.post_id === row.id).length,
    reply_count: replies.filter((r) => r.parent_id === row.id).length,
    liked: viewerId ? likes.some((l) => l.post_id === row.id && l.user_id === viewerId) : false,
    repost_of: reposts.find((p) => p.id === row.repost_of_id) ?? null,
  }));
}

export async function getFeed(scope: "for-you" | "following", viewerId: string | null) {
  let followingIds: string[] = [];
  if (scope === "following") {
    if (!viewerId) return [];
    const { data } = await supabase.from("follows").select("following_id").eq("follower_id", viewerId);
    followingIds = (data ?? []).map((f) => f.following_id).concat(viewerId);
    if (followingIds.length === 0) return [];
  }

  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (scope === "following") query = query.in("user_id", followingIds);

  const { data, error } = await query;
  if (error) throw error;
  return enrich((data ?? []) as unknown as PostBase[], viewerId);
}

export async function getUserPosts(
  userId: string,
  tab: "posts" | "replies" | "reposts",
  viewerId: string | null,
) {
  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (tab === "posts") query = query.is("parent_id", null).is("repost_of_id", null);
  if (tab === "replies") query = query.not("parent_id", "is", null);
  if (tab === "reposts") query = query.not("repost_of_id", "is", null);

  const { data, error } = await query;
  if (error) throw error;
  return enrich((data ?? []) as unknown as PostBase[], viewerId);
}

export async function getPost(id: string, viewerId: string | null) {
  const { data, error } = await supabase.from("posts").select(POST_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [post] = await enrich([data as unknown as PostBase], viewerId);
  return post ?? null;
}

export async function getReplies(postId: string, viewerId: string | null) {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("parent_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return enrich((data ?? []) as unknown as PostBase[], viewerId);
}

export async function createPost(input: {
  userId: string;
  content: string;
  imagePath?: string | null;
  parentId?: string | null;
  repostOfId?: string | null;
}) {
  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: input.userId,
      content: input.content,
      image_url: input.imagePath ?? null,
      parent_id: input.parentId ?? null,
      repost_of_id: input.repostOfId ?? null,
    })
    .select("id,parent_id")
    .single();
  if (error) throw error;

  if (input.parentId) {
    const { data: parent } = await supabase
      .from("posts")
      .select("user_id")
      .eq("id", input.parentId)
      .maybeSingle();
    if (parent && parent.user_id !== input.userId) {
      await supabase.from("notifications").insert({
        user_id: parent.user_id,
        actor_id: input.userId,
        type: "reply",
        post_id: data.id,
      });
    }
  }
  return data;
}

export async function deletePost(id: string) {
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleLike(postId: string, userId: string, liked: boolean, authorId: string) {
  if (liked) {
    const { error } = await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", userId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("likes").insert({ post_id: postId, user_id: userId });
  if (error) throw error;
  if (authorId !== userId) {
    await supabase
      .from("notifications")
      .insert({ user_id: authorId, actor_id: userId, type: "like", post_id: postId });
  }
}

export async function getProfileByUsername(username: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,username,display_name,bio,avatar_url")
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export async function getProfileById(id: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,username,display_name,bio,avatar_url")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export async function updateProfile(id: string, values: Partial<Profile>) {
  const { error } = await supabase.from("profiles").update(values).eq("id", id);
  if (error) throw error;
}

export async function getFollowStats(userId: string, viewerId: string | null) {
  const [followers, following, mine] = await Promise.all([
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", userId),
    viewerId
      ? supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", viewerId)
          .eq("following_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return {
    followers: followers.count ?? 0,
    following: following.count ?? 0,
    isFollowing: Boolean((mine as { data: unknown }).data),
  };
}

export async function toggleFollow(targetId: string, viewerId: string, isFollowing: boolean) {
  if (isFollowing) {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", viewerId)
      .eq("following_id", targetId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("follows").insert({ follower_id: viewerId, following_id: targetId });
  if (error) throw error;
  await supabase.from("notifications").insert({ user_id: targetId, actor_id: viewerId, type: "follow" });
}

export async function searchProfiles(term: string) {
  let query = supabase.from("profiles").select("id,username,display_name,bio,avatar_url").limit(30);
  if (term.trim()) {
    const like = `%${term.trim()}%`;
    query = query.or(`username.ilike.${like},display_name.ilike.${like}`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function searchPosts(term: string, viewerId: string | null) {
  if (!term.trim()) return [];
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .ilike("content", `%${term.trim()}%`)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return enrich((data ?? []) as unknown as PostBase[], viewerId);
}

export interface NotificationItem {
  id: string;
  type: string;
  post_id: string | null;
  read: boolean;
  created_at: string;
  profiles: Profile | null;
}

export async function getNotifications() {
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id,type,post_id,read,created_at,profiles!notifications_actor_profile_fk(id,username,display_name,bio,avatar_url)",
    )
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data ?? []) as unknown as NotificationItem[];
}

export async function markNotificationsRead(userId: string) {
  await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
}

export interface ConversationSummary {
  id: string;
  last_message_at: string;
  other: Profile | null;
  lastMessage: string | null;
}

export async function getConversations(viewerId: string) {
  const { data: memberships, error } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", viewerId);
  if (error) throw error;
  const ids = (memberships ?? []).map((m) => m.conversation_id);
  if (ids.length === 0) return [];

  const [{ data: convos }, { data: members }, { data: msgs }] = await Promise.all([
    supabase.from("conversations").select("id,last_message_at").in("id", ids),
    supabase
      .from("conversation_members")
      .select("conversation_id,user_id,profiles!cm_profile_fk(id,username,display_name,bio,avatar_url)")
      .in("conversation_id", ids),
    supabase
      .from("messages")
      .select("conversation_id,content,created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false }),
  ]);

  const memberRows = (members ?? []) as unknown as {
    conversation_id: string;
    user_id: string;
    profiles: Profile | null;
  }[];
  const messageRows = (msgs ?? []) as { conversation_id: string; content: string }[];

  return ((convos ?? []) as { id: string; last_message_at: string }[])
    .map<ConversationSummary>((c) => ({
      id: c.id,
      last_message_at: c.last_message_at,
      other: memberRows.find((m) => m.conversation_id === c.id && m.user_id !== viewerId)?.profiles ?? null,
      lastMessage: messageRows.find((m) => m.conversation_id === c.id)?.content ?? null,
    }))
    .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
}

export async function getOrCreateConversation(viewerId: string, otherId: string) {
  const { data: mine } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", viewerId);
  const myIds = (mine ?? []).map((m) => m.conversation_id);
  if (myIds.length > 0) {
    const { data: theirs } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", otherId)
      .in("conversation_id", myIds);
    const existing = (theirs ?? [])[0];
    if (existing) return existing.conversation_id;
  }

  const { data: convo, error } = await supabase.from("conversations").insert({}).select("id").single();
  if (error) throw error;
  const { error: memberError } = await supabase
    .from("conversation_members")
    .insert([
      { conversation_id: convo.id, user_id: viewerId },
      { conversation_id: convo.id, user_id: otherId },
    ]);
  if (memberError) throw memberError;
  return convo.id;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export async function getMessages(conversationId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("id,conversation_id,sender_id,content,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MessageRow[];
}

export async function sendMessage(conversationId: string, senderId: string, content: string) {
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, content });
  if (error) throw error;
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);
}

export async function getConversationPartner(conversationId: string, viewerId: string) {
  const { data } = await supabase
    .from("conversation_members")
    .select("user_id,profiles!cm_profile_fk(id,username,display_name,bio,avatar_url)")
    .eq("conversation_id", conversationId);
  const rows = (data ?? []) as unknown as { user_id: string; profiles: Profile | null }[];
  return rows.find((r) => r.user_id !== viewerId)?.profiles ?? null;
}

export async function uploadPostImage(file: File, userId: string) {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("post-media").upload(path, file);
  if (error) throw error;
  return path;
}

export async function getSignedUrl(path: string) {
  const { data, error } = await supabase.storage.from("post-media").createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
