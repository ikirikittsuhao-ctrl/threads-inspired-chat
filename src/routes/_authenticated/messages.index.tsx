import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getConversations } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { UserAvatar } from "@/components/UserAvatar";
import { timeAgo } from "@/lib/time";

export const Route = createFileRoute("/_authenticated/messages/")({
  head: () => ({
    meta: [
      { title: "メッセージ — sasuty" },
      { name: "description", content: "sasutyのダイレクトメッセージ一覧。リアルタイムでやりとり。" },
      { property: "og:title", content: "メッセージ — sasuty" },
      { property: "og:description", content: "sasutyのダイレクトメッセージ一覧。" },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const { userId } = useAuth();
  const conversations = useQuery({
    queryKey: ["conversations", userId],
    queryFn: () => (userId ? getConversations(userId) : Promise.resolve([])),
    enabled: Boolean(userId),
  });

  return (
    <AppShell title="メッセージ">
      {conversations.isLoading ? (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">読み込み中…</p>
      ) : (conversations.data ?? []).length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">
          まだ会話がありません。プロフィールからDMを送ってみましょう。
        </p>
      ) : (
        conversations.data?.map((c) => (
          <Link
            key={c.id}
            to="/messages/$conversationId"
            params={{ conversationId: c.id }}
            className="flex items-center gap-3 border-b border-border px-4 py-4"
          >
            <UserAvatar profile={c.other} linkless />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-semibold">
                  {c.other?.display_name || c.other?.username || "不明"}
                </p>
                {c.last_message_at && (
                  <span className="text-xs text-muted-foreground">{timeAgo(c.last_message_at)}</span>
                )}
              </div>
              <p className="truncate text-sm text-muted-foreground">{c.lastMessage ?? "メッセージはまだありません"}</p>
            </div>
          </Link>
        ))
      )}
    </AppShell>
  );
}
