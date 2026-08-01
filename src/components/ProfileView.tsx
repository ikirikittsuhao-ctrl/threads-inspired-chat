import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { getFollowStats, getUserPosts, toggleFollow, updateProfile, type Profile } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { PostCard } from "./PostCard";
import { UserAvatar } from "./UserAvatar";

const tabs = [
  { key: "posts", label: "スレッド" },
  { key: "replies", label: "返信" },
  { key: "reposts", label: "リポスト" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export function ProfileView({ profile }: { profile: Profile }) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("posts");
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio);

  const isMe = userId === profile.id;

  const stats = useQuery({
    queryKey: ["follow-stats", profile.id, userId],
    queryFn: () => getFollowStats(profile.id, userId),
  });

  const posts = useQuery({
    queryKey: ["user-posts", profile.id, tab, userId],
    queryFn: () => getUserPosts(profile.id, tab, userId),
  });

  const follow = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error("ログインが必要です");
      return toggleFollow(profile.id, userId, stats.data?.isFollowing ?? false);
    },
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: () => updateProfile(profile.id, { display_name: displayName, bio }),
    onSuccess: () => {
      toast.success("プロフィールを更新しました");
      setEditing(false);
      queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <section className="px-4 pb-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold">{profile.display_name || profile.username}</h1>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          </div>
          <UserAvatar profile={profile} size="lg" linkless />
        </div>

        {profile.bio && <p className="mt-3 whitespace-pre-wrap text-sm">{profile.bio}</p>}

        <p className="mt-3 text-sm text-muted-foreground">
          フォロワー {stats.data?.followers ?? 0}・フォロー中 {stats.data?.following ?? 0}
        </p>

        <div className="mt-4 flex gap-2">
          {isMe ? (
            <>
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className="flex-1 rounded-xl border border-border py-2 text-sm font-semibold"
              >
                プロフィールを編集
              </button>
              <button
                type="button"
                onClick={async () => {
                  await queryClient.cancelQueries();
                  queryClient.clear();
                  await supabase.auth.signOut();
                  window.location.href = "/auth";
                }}
                className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground"
              >
                ログアウト
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => follow.mutate()}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold ${
                  stats.data?.isFollowing
                    ? "border border-border text-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {stats.data?.isFollowing ? "フォロー中" : "フォロー"}
              </button>
              <Link
                to="/messages/new/$userId"
                params={{ userId: profile.id }}
                aria-label="メッセージを送る"
                className="flex items-center justify-center rounded-xl border border-border px-4"
              >
                <MessageCircle className="h-5 w-5" />
              </Link>
            </>
          )}
        </div>

        {editing && (
          <div className="mt-4 space-y-3 rounded-2xl border border-border p-4">
            <label className="block text-xs text-muted-foreground" htmlFor="display-name">
              表示名
            </label>
            <input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none"
            />
            <label className="block text-xs text-muted-foreground" htmlFor="bio">
              自己紹介
            </label>
            <textarea
              id="bio"
              value={bio}
              rows={3}
              onChange={(e) => setBio(e.target.value)}
              className="w-full resize-none rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => save.mutate()}
              className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground"
            >
              保存
            </button>
          </div>
        )}
      </section>

      <div className="flex border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 border-b-2 pb-3 text-sm font-medium transition-colors ${
              tab === t.key ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {posts.isLoading ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">読み込み中…</p>
      ) : (posts.data ?? []).length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">まだ投稿はありません</p>
      ) : (
        posts.data?.map((p) => <PostCard key={p.id} post={p} viewerId={userId} />)
      )}
    </div>
  );
}
