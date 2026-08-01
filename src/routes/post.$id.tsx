import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPost, getReplies } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { AppShell, useViewerProfile } from "@/components/AppShell";
import { PostCard } from "@/components/PostCard";
import { Composer } from "@/components/Composer";

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
    <AppShell title="スレッド">
      {post.isLoading ? (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">読み込み中…</p>
      ) : !post.data ? (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">スレッドが見つかりません</p>
      ) : (
        <>
          <PostCard post={post.data} viewerId={userId} onReply={() => setReplying(true)} />
          {replies.data?.map((r) => <PostCard key={r.id} post={r} viewerId={userId} />)}
          {userId && (
            <button
              type="button"
              onClick={() => setReplying(true)}
              className="fixed bottom-20 left-1/2 z-20 -translate-x-1/2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg"
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
