import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { searchProfiles } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { RowSkeleton } from "@/components/skeletons/Skeletons";
import { UserAvatar } from "@/components/UserAvatar";

export const Route = createFileRoute("/_authenticated/messages/new/")({
  head: () => ({
    meta: [
      { title: "新規メッセージ — sasuty" },
      { name: "description", content: "sasutyでDMを送る相手を検索して会話を始める。" },
      { property: "og:title", content: "新規メッセージ — sasuty" },
      { property: "og:description", content: "sasutyでDMを送る相手を検索。" },
    ],
  }),
  component: NewMessagePage,
});

function NewMessagePage() {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");

  const results = useQuery({
    queryKey: ["dm-search", term],
    queryFn: () => searchProfiles(term.trim()),
    enabled: term.trim().length > 0,
  });

  const people = (results.data ?? []).filter((p) => p.id !== userId);

  return (
    <AppShell title="新規メッセージ">
      <div className="border-b border-border p-3">
        <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="ユーザーを検索"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      {term.trim().length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">
          ユーザー名を入力して相手を探しましょう。
        </p>
      ) : results.isLoading ? (
        <RowSkeleton count={4} />
      ) : people.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">見つかりませんでした。</p>
      ) : (
        people.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => void navigate({ to: "/messages/new/$userId", params: { userId: p.id } })}
            className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left"
          >
            <UserAvatar profile={p} linkless />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{p.display_name || p.username}</p>
              <p className="truncate text-sm text-muted-foreground">@{p.username}</p>
            </div>
          </button>
        ))
      )}
    </AppShell>
  );
}
