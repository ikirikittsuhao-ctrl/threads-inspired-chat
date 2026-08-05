import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, MessageCircle, Repeat2, Share, Trash2 } from "lucide-react";
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
  index?: number;
}

export function PostCard({ post, viewerId, onReply, compact, index = 0 }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries();
  const [likeBurst, setLikeBurst] = useState(false);
  const [repostBurst, setRepostBurst] = useState(false);

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

  const openThread = () => navigate({ to: "/post/$id", params: { id: target.id } });

  return (
    <article
      className="animate-rise-in border-b border-border px-4 py-3 transition-colors hover:bg-accent/40"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      {post.repost_of && (
        <p className="mb-1.5 pl-12 text-xs font-medium text-muted-foreground">
          <Repeat2 className="mr-1 inline h-3.5 w-3.5" />
          {post.profiles?.display_name || post.profiles?.username} さんがリポスト
        </p>
      )}
      <div className="flex gap-3">
        <UserAvatar profile={author} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[15px]">
            {author ? (
              <>
                <Link
                  to="/u/$username"
                  params={{ username: author.username }}
                  className="truncate font-bold hover:underline"
                >
                  {author.display_name || author.username}
                </Link>
                <span className="truncate text-sm text-muted-foreground">@{author.username}</span>
              </>
            ) : (
              <span className="font-bold">不明なユーザー</span>
            )}
            <span className="text-sm text-muted-foreground">·</span>
            <span className="shrink-0 text-sm text-muted-foreground">{timeAgo(target.created_at)}</span>
            {viewerId === post.user_id && (
              <button
                type="button"
                aria-label="投稿を削除"
                onClick={() => remove.mutate()}
                className="tap ml-auto grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <button type="button" className="block w-full text-left" onClick={openThread}>
            {target.content && (
              <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-normal">
                {target.content}
              </p>
            )}
            {target.image_url && <SignedImage path={target.image_url} alt="投稿画像" />}
          </button>

          {!compact && (
            <div className="mt-2 flex max-w-md items-center justify-between pr-4">
              <button
                type="button"
                aria-label="返信"
                onClick={() => (onReply ? onReply(target) : openThread())}
                className="action-btn group hover:text-brand"
              >
                <span className="action-icon group-hover:bg-brand/10">
                  <MessageCircle className="h-[18px] w-[18px]" />
                </span>
                {post.reply_count > 0 && post.reply_count}
              </button>

              {isOwn ? (
                <span aria-label="リポスト不可" className="action-btn opacity-40">
                  <span className="action-icon">
                    <Repeat2 className="h-[18px] w-[18px]" />
                  </span>
                </span>
              ) : (
                <button
                  type="button"
                  aria-label="リポスト"
                  onClick={() => {
                    setRepostBurst(true);
                    repost.mutate();
                  }}
                  onAnimationEnd={() => setRepostBurst(false)}
                  className="action-btn group hover:text-repost"
                >
                  <span className="action-icon group-hover:bg-repost/10">
                    <Repeat2 className={`h-[18px] w-[18px] ${repostBurst ? "animate-spin-flash" : ""}`} />
                  </span>
                </button>
              )}

              {isOwn ? (
                <span aria-label="いいね数" className="action-btn opacity-40">
                  <span className="action-icon">
                    <Heart className="h-[18px] w-[18px]" />
                  </span>
                  {post.like_count > 0 && post.like_count}
                </span>
              ) : (
                <button
                  type="button"
                  aria-label="いいね"
                  onClick={() => {
                    if (!post.liked) setLikeBurst(true);
                    like.mutate();
                  }}
                  className={`action-btn group hover:text-like ${post.liked ? "text-like" : ""}`}
                >
                  <span className="action-icon group-hover:bg-like/10">
                    <Heart
                      onAnimationEnd={() => setLikeBurst(false)}
                      className={`h-[18px] w-[18px] ${post.liked ? "fill-current" : ""} ${
                        likeBurst ? "animate-pop" : ""
                      }`}
                    />
                  </span>
                  {post.like_count > 0 && (
                    <span key={post.like_count} className="animate-count-in">
                      {post.like_count}
                    </span>
                  )}
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
                className="action-btn group hover:text-brand"
              >
                <span className="action-icon group-hover:bg-brand/10">
                  <Share className="h-[18px] w-[18px]" />
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
