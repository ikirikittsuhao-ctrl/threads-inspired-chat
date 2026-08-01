import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { searchProfiles, searchPosts } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { PostCard } from "@/components/PostCard";
import { UserAvatar } from "@/components/UserAvatar";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "検索 — sasuty" },
      { name: "description", content: "sasutyでユーザーやスレッドを検索して、新しい声を見つけよう。" },
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
      <div className="border-b border-border px-4 py-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ユーザーやキーワードを検索"
          className="w-full rounded-xl bg-secondary px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <section>
        {people.data?.map((p) => (
          <Link
            key={p.id}
            to="/u/$username"
            params={{ username: p.username }}
            className="flex items-center gap-3 border-b border-border px-4 py-3"
          >
            <UserAvatar profile={p} linkless />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{p.display_name || p.username}</p>
              <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
            </div>
          </Link>
        ))}
      </section>

      {(posts.data ?? []).length > 0 && (
        <section>
          <h2 className="px-4 py-3 text-xs font-semibold text-muted-foreground">スレッド</h2>
          {posts.data?.map((p) => <PostCard key={p.id} post={p} viewerId={userId} />)}
        </section>
      )}
    </AppShell>
  );
}
