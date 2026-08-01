import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getConversationPartner, getMessages, sendMessage } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { UserAvatar } from "@/components/UserAvatar";

export const Route = createFileRoute("/_authenticated/messages/$conversationId")({
  head: () => ({
    meta: [
      { title: "チャット — sasuty" },
      { name: "description", content: "sasutyのダイレクトメッセージをリアルタイムでやりとり。" },
      { property: "og:title", content: "チャット — sasuty" },
      { property: "og:description", content: "sasutyのダイレクトメッセージ。" },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { conversationId } = Route.useParams();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const partner = useQuery({
    queryKey: ["chat-partner", conversationId, userId],
    queryFn: () => (userId ? getConversationPartner(conversationId, userId) : Promise.resolve(null)),
    enabled: Boolean(userId),
  });

  const messages = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => getMessages(conversationId),
  });

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => queryClient.invalidateQueries({ queryKey: ["messages", conversationId] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data?.length]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !text.trim()) return;
    const value = text.trim();
    setText("");
    await sendMessage(conversationId, userId, value);
    void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
  }

  return (
    <AppShell title={partner.data?.display_name || partner.data?.username || "チャット"}>
      <div className="flex flex-col gap-2 px-4 py-4">
        {messages.data?.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
              {!mine && <UserAvatar profile={partner.data ?? null} size="sm" linkless />}
              <p
                className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm ${
                  mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                {m.content}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={submit}
        className="fixed bottom-16 left-1/2 flex w-full max-w-xl -translate-x-1/2 gap-2 border-t border-border bg-background px-4 py-3"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="メッセージを入力"
          className="flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          送信
        </button>
      </form>
    </AppShell>
  );
}
