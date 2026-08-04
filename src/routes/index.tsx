import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getFeed } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { PostCard } from "@/components/PostCard";
import { Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "sasuty" },
      {
        name: "description",
        content: "sasutyは、短いテキストと画像で気軽につながるSNS。フォロー、返信、リポスト、DMまで。",
      },
      { property: "og:title", content: "sasuty" },
      { property: "og:description", content: "sasutyは、短いテキストと画像で気軽につながるSNS。フォロー、返信、リポスト、DMまで。" },
    ],
  }),
  component: HomeFeed,
});

function HomeFeed() {
  const { userId } = useAuth();
  const [scope, setScope] = useState<"for-you" | "following">("for-you");

  const feed = useQuery({
    queryKey: ["feed", scope, userId],
    queryFn: () => getFeed(scope, userId),
  });

  return (
    <AppShell
      right={
        <Link to="/messages" aria-label="メッセージ" className="text-muted-foreground hover:text-foreground">
          <Mail className="h-5 w-5" />
        </Link>
      }
    >
      <div className="flex border-b border-border">
        {(
          [
            { key: "for-you", label: "おすすめ" },
            { key: "following", label: "フォロー中" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setScope(t.key)}
            className={`flex-1 border-b-2 py-3 text-sm font-medium transition-colors ${
              scope === t.key ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {feed.isLoading ? (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">読み込み中…</p>
      ) : (feed.data ?? []).length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {scope === "following" ? "フォロー中のスレッドはまだありません" : "最初のスレッドを投稿しましょう"}
          </p>
          {!userId && (
            <Link
              to="/auth"
              className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
            >
              sasuty をはじめる
            </Link>
          )}
        </div>
      ) : (
        feed.data?.map((p) => <PostCard key={p.id} post={p} viewerId={userId} />)
      )}
    </AppShell>
  );
}
