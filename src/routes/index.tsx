import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getFeed } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { PostCard } from "@/components/PostCard";
import { PostSkeleton } from "@/components/skeletons/Skeletons";
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

  const tabs = [
    { key: "for-you", label: "おすすめ" },
    { key: "following", label: "フォロー中" },
  ] as const;

  return (
    <AppShell
      right={
        <Link
          to="/messages"
          aria-label="メッセージ"
          className="tap grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Mail className="h-5 w-5" />
        </Link>
      }
    >
      <div className="sticky top-[3.6rem] z-20 flex border-b border-border bg-background/75 backdrop-blur-xl">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setScope(t.key)}
            className={`tap relative flex-1 py-3.5 text-sm font-semibold transition-colors ${
              scope === t.key ? "text-foreground" : "text-muted-foreground hover:bg-accent/50"
            }`}
          >
            {t.label}
            <span
              className={`absolute bottom-0 left-1/2 h-1 -translate-x-1/2 rounded-full bg-brand transition-all duration-300 ${
                scope === t.key ? "w-14 opacity-100" : "w-0 opacity-0"
              }`}
            />
          </button>
        ))}
      </div>

      {feed.isLoading ? (
        <PostSkeleton />
      ) : (feed.data ?? []).length === 0 ? (
        <div className="animate-rise-in px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {scope === "following" ? "フォロー中の投稿はまだありません" : "最初の投稿をしてみましょう"}
          </p>
          {!userId && (
            <Link
              to="/auth"
              className="tap mt-4 inline-block rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-brand-foreground"
            >
              sasuty をはじめる
            </Link>
          )}
        </div>
      ) : (
        feed.data?.map((p, i) => <PostCard key={p.id} post={p} viewerId={userId} index={i} />)
      )}
    </AppShell>
  );
}
