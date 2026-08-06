import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Image as ImageIcon, Send } from "lucide-react";
import { getConversationPartner, getMessages, sendMessage, type MessageRow,
  markConversationRead,
} from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { ChatSkeleton } from "@/components/skeletons/Skeletons";
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

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return `今日 ${d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleString("ja-JP", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface Bubble extends MessageRow {
  first: boolean;
  last: boolean;
  separator: string | null;
}

function group(messages: MessageRow[]): Bubble[] {
  return messages.map((m, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const gap = prev ? new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() : Infinity;
    const first = !prev || prev.sender_id !== m.sender_id || gap > 5 * 60 * 1000;
    const last =
      !next ||
      next.sender_id !== m.sender_id ||
      new Date(next.created_at).getTime() - new Date(m.created_at).getTime() > 5 * 60 * 1000;
    return {
      ...m,
      first,
      last,
      separator: !prev || gap > 60 * 60 * 1000 ? dayLabel(m.created_at) : null,
    };
  });
}

function ChatPage() {
  const { conversationId } = Route.useParams();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
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

  const bubbles = useMemo(() => group(messages.data ?? []), [messages.data]);

  useEffect(() => {
    if (!userId) return;
    void markConversationRead(conversationId, userId).then(() =>
      queryClient.invalidateQueries({ queryKey: ["conversations", userId] }),
    );
  }, [conversationId, userId, queryClient, messages.data?.length]);

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
  }, [bubbles.length]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !text.trim() || sending) return;
    const value = text.trim().slice(0, 2000);
    setText("");
    setSending(true);
    try {
      await sendMessage(conversationId, userId, value);
      void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations", userId] });
    } finally {
      setSending(false);
    }
  }

  const other = partner.data ?? null;

  return (
    <AppShell title="メッセージ">
      {/* Instagram風のチャットヘッダー */}
      <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur">
        <UserAvatar profile={other} size="sm" linkless />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            {other?.display_name || other?.username || "…"}
          </p>
          {other && <p className="truncate text-xs text-muted-foreground">@{other.username}</p>}
        </div>
        {other && (
          <Link
            to="/u/$username"
            params={{ username: other.username }}
            className="rounded-full border border-border px-3 py-1 text-xs"
          >
            プロフィール
          </Link>
        )}
      </div>

      {messages.isLoading && bubbles.length === 0 && <ChatSkeleton />}

      {/* 会話の始まり */}
      {bubbles.length === 0 && !messages.isLoading && (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <UserAvatar profile={other} size="lg" linkless />
          <p className="mt-2 text-base font-semibold">{other?.display_name || other?.username}</p>
          <p className="text-xs text-muted-foreground">@{other?.username} · sasuty</p>
          <p className="mt-2 text-sm text-muted-foreground">メッセージを送って会話を始めましょう。</p>
        </div>
      )}

      <div className="flex flex-col gap-0.5 px-3 pb-36 pt-3">
        {bubbles.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div key={m.id} className="animate-rise-in">
              {m.separator && (
                <p className="py-4 text-center text-[11px] font-medium text-muted-foreground">{m.separator}</p>
              )}
              <div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${m.last ? "mb-2" : ""}`}>
                {!mine &&
                  (m.last ? (
                    <UserAvatar profile={other} size="xs" linkless />
                  ) : (
                    <span className="h-7 w-7 shrink-0" />
                  ))}
                <p
                  className={`max-w-[72%] whitespace-pre-wrap break-words px-3.5 py-2 text-[15px] leading-snug ${
                    mine
                      ? "bg-brand text-brand-foreground"
                      : "bg-secondary text-secondary-foreground"
                  } ${
                    mine
                      ? `rounded-l-[20px] ${m.first ? "rounded-tr-[20px]" : "rounded-tr-md"} ${
                          m.last ? "rounded-br-[20px]" : "rounded-br-md"
                        }`
                      : `rounded-r-[20px] ${m.first ? "rounded-tl-[20px]" : "rounded-tl-md"} ${
                          m.last ? "rounded-bl-[20px]" : "rounded-bl-md"
                        }`
                  }`}
                >
                  {m.content}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={submit}
        className="fixed bottom-16 left-1/2 flex w-full max-w-xl -translate-x-1/2 items-center gap-2 border-t border-border bg-background px-3 py-2.5"
      >
        <div className="flex flex-1 items-center gap-2 rounded-full border border-border px-4 py-2">
          <input
            value={text}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
            placeholder="メッセージ..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <ImageIcon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        </div>
        {text.trim() ? (
          <button
            type="submit"
            disabled={sending}
            aria-label="送信"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Send className="h-[18px] w-[18px]" />
          </button>
        ) : (
          <span
            aria-hidden
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground"
          >
            <Heart className="h-5 w-5" />
          </span>
        )}
      </form>
    </AppShell>
  );
}
