import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Camera, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import {
  getFollowStats,
  getUserPosts,
  isUsernameTaken,
  toggleFollow,
  updateProfile,
  uploadAvatar,
  type Profile,
} from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { PostSkeleton } from "@/components/skeletons/Skeletons";
import { PostCard } from "./PostCard";
import { UserAvatar, useAvatarUrl } from "./UserAvatar";

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
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);
  const [isPrivate, setIsPrivate] = useState(profile.is_private);
  const [avatarPath, setAvatarPath] = useState<string | null>(profile.avatar_url);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrl = useAvatarUrl(avatarPath);

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
    mutationFn: async () => {
      const nextUsername = username.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(nextUsername)) {
        throw new Error("ユーザー名は英小文字・数字・_ の3〜20文字にしてください");
      }
      if (displayName.trim().length > 40) throw new Error("表示名は40文字以内にしてください");
      if (bio.length > 300) throw new Error("自己紹介は300文字以内にしてください");
      if (nextUsername !== profile.username && (await isUsernameTaken(nextUsername, profile.id))) {
        throw new Error("そのユーザー名は使用されています");
      }
      await updateProfile(profile.id, {
        username: nextUsername,
        display_name: displayName.trim(),
        bio,
        is_private: isPrivate,
        avatar_url: avatarPath,
      });
    },
    onSuccess: () => {
      toast.success("プロフィールを更新しました");
      setEditing(false);
      void queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function pickAvatar(file: File | undefined) {
    if (!file || !userId) return;
    if (!file.type.startsWith("image/")) {
      toast.error("画像ファイルを選択してください");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("画像は5MB以下にしてください");
      return;
    }
    setUploading(true);
    try {
      setAvatarPath(await uploadAvatar(file, userId));
      toast.success("画像をアップロードしました。保存を押してください");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <section className="px-4 pb-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold">{profile.display_name || profile.username}</h1>
            <p className="text-sm text-muted-foreground">
              @{profile.username}
              {profile.is_private && <span className="ml-2 text-xs">🔒 非公開アカウント</span>}
            </p>
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

        {editing && isMe && (
          <div className="mt-4 space-y-4 rounded-2xl border border-border p-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative"
                aria-label="プロフィール画像を変更"
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="プロフィール画像"
                    className="h-16 w-16 rounded-full border border-border object-cover"
                  />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-secondary text-xl font-semibold">
                    {(displayName || username || "?").charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="absolute -bottom-1 -right-1 rounded-full border border-border bg-background p-1.5">
                  <Camera className="h-3.5 w-3.5" />
                </span>
              </button>
              <div className="text-xs text-muted-foreground">
                {uploading ? "アップロード中…" : "タップして写真を変更（5MBまで）"}
                {avatarPath && (
                  <button
                    type="button"
                    onClick={() => setAvatarPath(null)}
                    className="mt-1 block text-xs text-destructive"
                  >
                    画像を削除
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void pickAvatar(e.target.files?.[0])}
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground" htmlFor="username">
                ユーザー名
              </label>
              <input
                id="username"
                value={username}
                maxLength={20}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground" htmlFor="display-name">
                表示名
              </label>
              <input
                id="display-name"
                value={displayName}
                maxLength={40}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground" htmlFor="bio">
                自己紹介
              </label>
              <textarea
                id="bio"
                value={bio}
                rows={3}
                maxLength={300}
                onChange={(e) => setBio(e.target.value)}
                className="mt-1 w-full resize-none rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none"
              />
              <p className="mt-1 text-right text-[11px] text-muted-foreground">{bio.length}/300</p>
            </div>

            <label className="flex items-center justify-between gap-3 text-sm" htmlFor="private">
              <span>
                非公開アカウント
                <span className="block text-xs text-muted-foreground">プロフィールに鍵マークを表示します</span>
              </span>
              <input
                id="private"
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="h-5 w-5 accent-[hsl(var(--primary))]"
              />
            </label>

            <button
              type="button"
              disabled={save.isPending || uploading}
              onClick={() => save.mutate()}
              className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {save.isPending ? "保存中…" : "保存"}
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
            className={`tap flex-1 border-b-2 pb-3 text-sm font-semibold transition-colors ${
              tab === t.key ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:bg-accent/40"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {posts.isLoading ? (
        <PostSkeleton count={3} />
      ) : (posts.data ?? []).length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">まだ投稿はありません</p>
      ) : (
        posts.data?.map((p, i) => <PostCard key={p.id} post={p} viewerId={userId} index={i} />)
      )}
    </div>
  );
}
