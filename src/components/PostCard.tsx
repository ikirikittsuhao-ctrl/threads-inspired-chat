import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, MessageCircle, Repeat2, Send, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Post, PostBase } from "@/lib/api";
import { createPost, deletePost, toggleLike } from "@/lib/api";
import { timeAgo } from "@/lib/time";
import { UserAvatar } from "./UserAvatar";
import { SignedImage } from "./SignedImage";

interface Props {
  post: Post;
  viewerId: string | null;
  onReply?: (post: PostBase) => void;
  compact?: boolean;
}

export function PostCard({ post, viewerId, onReply, compact }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries();

  const like = useMutation({
    mutationFn: () => {
      if (!viewerId) throw new Error("ログインが必要です");
      return toggleLike(post.id, viewerId, post.liked, post.user_id);
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const repost = useMutation({
    mutationFn: () => {
      if (!viewerId) throw new Error("ログインが必要です");
      return createPost({ userId: viewerId, content: "", repostOfId: post.repost_of?.id ?? post.id });
    },
    onSuccess: () => {
      toast.success("リポストしました");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => deletePost(post.id),
    onSuccess: () => {
      toast.success("削除しました");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const target = post.repost_of ?? post;
  const author = target.profiles;
  const isOwn = viewerId != null && viewerId === target.user_id;


  return (
    <article className="border-b border-border px-4 py-4">
      {post.repost_of && (
        <p className="mb-2 pl-12 text-xs text-muted-foreground">
          <Repeat2 className="mr-1 inline h-3.5 w-3.5" />
          {post.profiles?.display_name || post.profiles?.username} さんがリポスト
        </p>
      )}
      <div className="flex gap-3">
        <UserAvatar profile={author} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {author ? (
              <Link
                to="/u/$username"
                params={{ username: author.username }}
                className="truncate text-sm font-semibold hover:underline"
              >
                {author.display_name || author.username}
              </Link>
            ) : (
              <span className="text-sm font-semibold">不明なユーザー</span>
            )}
            <span className="text-xs text-muted-foreground">{timeAgo(target.created_at)}</span>
            {viewerId === post.user_id && (
              <button
                type="button"
                aria-label="投稿を削除"
                onClick={() => remove.mutate()}
                className="ml-auto text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            className="block w-full text-left"
            onClick={() => navigate({ to: "/post/$id", params: { id: target.id } })}
          >
            {target.content && (
              <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                {target.content}
              </p>
            )}
            {target.image_url && <SignedImage path={target.image_url} alt="投稿画像" />}
          </button>

          {!compact && (
            <div className="mt-3 flex items-center gap-5 text-muted-foreground">
              {isOwn ? (
                <span
                  aria-label="いいね数"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground/70"
                >
                  <Heart className="h-[18px] w-[18px]" />
                  {post.like_count > 0 && post.like_count}
                </span>
              ) : (
                <button
                  type="button"
                  aria-label="いいね"
                  onClick={() => like.mutate()}
                  className={`flex items-center gap-1.5 text-sm transition-colors hover:text-like ${
                    post.liked ? "text-like" : ""
                  }`}
                >
                  <Heart className={`h-[18px] w-[18px] ${post.liked ? "fill-current" : ""}`} />
                  {post.like_count > 0 && post.like_count}
                </button>
              )}

              <button
                type="button"
                aria-label="返信"
                onClick={() => (onReply ? onReply(target) : navigate({ to: "/post/$id", params: { id: target.id } }))}
                className="flex items-center gap-1.5 text-sm transition-colors hover:text-foreground"
              >
                <MessageCircle className="h-[18px] w-[18px]" />
                {post.reply_count > 0 && post.reply_count}
              </button>
              {!isOwn && (
                <button
                  type="button"
                  aria-label="リポスト"
                  onClick={() => repost.mutate()}
                  className="flex items-center gap-1.5 text-sm transition-colors hover:text-foreground"
                >
                  <Repeat2 className="h-[18px] w-[18px]" />
                </button>
              )}

              <button
                type="button"
                aria-label="共有"
                onClick={() => {
                  const url = `${window.location.origin}/post/${target.id}`;
                  navigator.clipboard?.writeText(url);
                  toast.success("リンクをコピーしました");
                }}
                className="flex items-center gap-1.5 text-sm transition-colors hover:text-foreground"
              >
                <Send className="h-[18px] w-[18px]" />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
