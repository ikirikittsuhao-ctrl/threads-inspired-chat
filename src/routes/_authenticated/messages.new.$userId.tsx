import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getOrCreateConversation } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/messages/new/$userId")({
  head: () => ({
    meta: [
      { title: "新しいメッセージ — sasuty" },
      { name: "description", content: "sasutyで新しいダイレクトメッセージを開始する。" },
      { property: "og:title", content: "新しいメッセージ — sasuty" },
      { property: "og:description", content: "sasutyで新しいDMを開始。" },
    ],
  }),
  component: NewConversation,
});

function NewConversation() {
  const { userId: otherId } = Route.useParams();
  const { userId } = useAuth();
  const navigate = useNavigate();

  const convo = useQuery({
    queryKey: ["new-conversation", userId, otherId],
    queryFn: () => getOrCreateConversation(userId!, otherId),
    enabled: Boolean(userId),
    retry: false,
  });

  useEffect(() => {
    if (!convo.data) return;
    void navigate({
      to: "/messages/$conversationId",
      params: { conversationId: convo.data },
      replace: true,
    });
  }, [convo.data, navigate]);

  return (
    <AppShell title="メッセージ">
      {convo.isError ? (
        <div className="px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            会話を開始できませんでした。{convo.error instanceof Error ? convo.error.message : ""}
          </p>
          <button
            type="button"
            onClick={() => void convo.refetch()}
            className="mt-4 rounded-xl border border-border px-4 py-2 text-sm font-semibold"
          >
            再試行
          </button>
        </div>
      ) : (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">会話を準備中…</p>
      )}
    </AppShell>
  );
}
