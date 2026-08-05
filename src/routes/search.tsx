import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { searchProfiles, searchPosts } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { PostCard } from "@/components/PostCard";
import { UserAvatar } from "@/components/UserAvatar";
import { PostSkeleton, RowSkeleton } from "@/components/skeletons/Skeletons";
import { Search as SearchIcon } from "lucide-react";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "検索 — sasuty" },
      { name: "description", content: "sasutyでユーザーや投稿を検索して、新しい声を見つけよう。" },
      { property: "og:title", content: "検索 — sasuty" },
      { property: "og:description", content: "ユーザー名やキーワードでsasutyを検索。" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { userId } = useAuth();
  const [q, setQ] = useState("");

  const people = useQuery({
    queryKey: ["search-profiles", q],
    queryFn: () => searchProfiles(q),
  });

  const posts = useQuery({
    queryKey: ["search-posts", q, userId],
    queryFn: () => searchPosts(q, userId),
    enabled: q.trim().length > 0,
  });

  return (
    <AppShell title="検索">
      <div className="sticky top-[3.6rem] z-20 border-b border-border bg-background/75 px-4 py-2.5 backdrop-blur-xl">
        <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5 transition-colors focus-within:bg-background focus-within:ring-1 focus-within:ring-brand">
          <SearchIcon className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ユーザーやキーワードを検索"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <section>
        {people.isLoading ? (
          <RowSkeleton count={4} />
        ) : (
          people.data?.map((p, i) => (
            <Link
              key={p.id}
              to="/u/$username"
              params={{ username: p.username }}
              className="animate-rise-in flex items-center gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-accent/40"
              style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
            >
              <UserAvatar profile={p} linkless />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{p.display_name || p.username}</p>
                <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
              </div>
            </Link>
          ))
        )}
      </section>

      {posts.isLoading && q.trim() ? (
        <PostSkeleton count={3} />
      ) : (
        (posts.data ?? []).length > 0 && (
          <section>
            <h2 className="px-4 py-3 text-xs font-bold text-muted-foreground">投稿</h2>
            {posts.data?.map((p, i) => <PostCard key={p.id} post={p} viewerId={userId} index={i} />)}
          </section>
        )
      )}
    </AppShell>
  );
}
