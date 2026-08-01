import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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

  useEffect(() => {
    if (!userId) return;
    void getOrCreateConversation(userId, otherId).then((id) =>
      navigate({ to: "/messages/$conversationId", params: { conversationId: id }, replace: true }),
    );
  }, [userId, otherId, navigate]);

  return (
    <AppShell title="メッセージ">
      <p className="px-4 py-12 text-center text-sm text-muted-foreground">会話を準備中…</p>
    </AppShell>
  );
}
