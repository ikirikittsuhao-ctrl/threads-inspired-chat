import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPost, getReplies } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { AppShell, useViewerProfile } from "@/components/AppShell";
import { PostCard } from "@/components/PostCard";
import { Composer } from "@/components/Composer";
import { PostSkeleton } from "@/components/skeletons/Skeletons";

export const Route = createFileRoute("/post/$id")({
  head: () => ({
    meta: [
      { title: "スレッド — sasuty" },
      { name: "description", content: "sasutyのスレッドと返信を見る。" },
      { property: "og:title", content: "スレッド — sasuty" },
      { property: "og:description", content: "sasutyのスレッドと返信を見る。" },
    ],
  }),
  component: PostDetail,
});

function PostDetail() {
  const { id } = Route.useParams();
  const { userId } = useAuth();
  const { data: profile } = useViewerProfile();
  const [replying, setReplying] = useState(false);

  const post = useQuery({ queryKey: ["post", id, userId], queryFn: () => getPost(id, userId) });
  const replies = useQuery({ queryKey: ["replies", id, userId], queryFn: () => getReplies(id, userId) });

  return (
    <AppShell title="ポスト" hideCompose>
      {post.isLoading ? (
        <PostSkeleton count={3} />
      ) : !post.data ? (
        <p className="animate-fade-in px-4 py-16 text-center text-sm text-muted-foreground">
          投稿が見つかりません
        </p>
      ) : (
        <>
          <PostCard post={post.data} viewerId={userId} onReply={() => setReplying(true)} />
          {replies.isLoading ? (
            <PostSkeleton count={2} />
          ) : (
            replies.data?.map((r, i) => <PostCard key={r.id} post={r} viewerId={userId} index={i} />)
          )}
          {userId && (
            <button
              type="button"
              onClick={() => setReplying(true)}
              className="tap fixed bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-full bg-brand px-7 py-3 text-sm font-bold text-brand-foreground shadow-lg shadow-brand/25"
            >
              返信する
            </button>
          )}
          {replying && userId && post.data && (
            <Composer
              viewerId={userId}
              viewerProfile={profile ?? null}
              replyTo={post.data}
              onClose={() => setReplying(false)}
            />
          )}
        </>
      )}
    </AppShell>
  );
}
