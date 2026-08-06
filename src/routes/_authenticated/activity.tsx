import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getNotifications, markNotificationsRead } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { UserAvatar } from "@/components/UserAvatar";
import { RowSkeleton } from "@/components/skeletons/Skeletons";
import { timeAgo } from "@/lib/time";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({
    meta: [
      { title: "アクティビティ — sasuty" },
      { name: "description", content: "いいね・返信・フォローなど、sasutyの通知をまとめて確認。" },
      { property: "og:title", content: "アクティビティ — sasuty" },
      { property: "og:description", content: "いいね・返信・フォローなどの通知一覧。" },
    ],
  }),
  component: ActivityPage,
});

const labels: Record<string, string> = {
  like: "があなたの投稿にいいねしました",
  reply: "があなたの投稿に返信しました",
  follow: "があなたをフォローしました",
  repost: "があなたの投稿をリポストしました",
};

function ActivityPage() {
  const { userId } = useAuth();
  const notifications = useQuery({ queryKey: ["notifications", userId], queryFn: getNotifications });

  useEffect(() => {
    if (!userId || notifications.isLoading) return;
    const timer = setTimeout(() => {
      void markNotificationsRead(userId);
    }, 1500);
    return () => clearTimeout(timer);
  }, [userId, notifications.isLoading]);

  return (
    <AppShell title="通知">
      {notifications.isLoading ? (
        <RowSkeleton />
      ) : (notifications.data ?? []).length === 0 ? (
        <p className="animate-fade-in px-4 py-16 text-center text-sm text-muted-foreground">
          通知はまだありません
        </p>
      ) : (
        notifications.data?.map((n, i) => {
          const body = (
            <div
              className={`animate-rise-in flex items-center gap-3 border-b border-border px-4 py-4 transition-colors hover:bg-accent/40 ${
                n.read ? "" : "border-l-2 border-l-brand bg-brand/10"
              }`}
              style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
            >
              <UserAvatar profile={n.profiles} linkless />
              <p className="text-sm">
                <span className="font-bold">{n.profiles?.display_name || n.profiles?.username}</span>
                <span className="text-muted-foreground">{labels[n.type] ?? "からの通知"}</span>
                <span className="ml-2 text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
              </p>
            </div>
          );
          return n.post_id ? (
            <Link key={n.id} to="/post/$id" params={{ id: n.post_id }} className="block">
              {body}
            </Link>
          ) : (
            <div key={n.id}>{body}</div>
          );
        })
      )}
    </AppShell>
  );
}
