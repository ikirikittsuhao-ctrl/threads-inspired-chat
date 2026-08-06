import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Feather, Home, Mail, Search, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getConversations, getProfileById, getUnreadNotificationCount } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { SastyLogo } from "./SastyLogo";
import { Composer } from "./Composer";
import { UserAvatar } from "./UserAvatar";

export function useViewerProfile() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: () => (userId ? getProfileById(userId) : Promise.resolve(null)),
    enabled: Boolean(userId),
  });
}

interface Props {
  children: ReactNode;
  title?: string;
  right?: ReactNode;
  hideCompose?: boolean;
}

export function AppShell({ children, title, right, hideCompose }: Props) {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const { data: profile } = useViewerProfile();
  const { data: unreadNotifications = 0 } = useQuery({
    queryKey: ["unread-notifications", userId],
    queryFn: () => (userId ? getUnreadNotificationCount(userId) : Promise.resolve(0)),
    enabled: Boolean(userId),
    refetchInterval: 30000,
  });
  const { data: unreadDms = 0 } = useQuery({
    queryKey: ["unread-dms", userId],
    queryFn: async () =>
      userId ? (await getConversations(userId)).reduce((sum, c) => sum + c.unread, 0) : 0,
    enabled: Boolean(userId),
    refetchInterval: 30000,
  });
  const [composing, setComposing] = useState(false);

  const tabClass = "tap flex flex-1 items-center justify-center py-3.5 text-muted-foreground";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col border-x border-border">
      <header className="sticky top-0 z-30 grid grid-cols-[3rem_1fr_3rem] items-center border-b border-border bg-background/75 px-3 py-2.5 backdrop-blur-xl">
        <div className="flex items-center">
          {userId ? (
            <Link to="/me" aria-label="プロフィール" className="tap">
              <UserAvatar profile={profile ?? null} size="sm" linkless />
            </Link>
          ) : (
            <Link to="/auth" aria-label="ログイン" className="tap">
              <SastyLogo className="h-6 w-6 text-foreground" />
            </Link>
          )}
        </div>
        <div className="flex items-center justify-center gap-2">
          {title ? (
            <span className="text-base font-bold tracking-tight">{title}</span>
          ) : (
            <Link to="/" aria-label="ホーム" className="tap">
              <SastyLogo className="h-7 w-7 text-foreground" />
            </Link>
          )}
        </div>
        <div className="flex items-center justify-end gap-2">
          {right ?? (
            userId && (
              <Link to="/messages" aria-label="メッセージ" className="tap relative">
                <Mail className={`h-6 w-6 ${unreadDms > 0 ? "text-brand" : "text-muted-foreground"}`} />
                {unreadDms > 0 && (
                  <span className="animate-pop absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
                    {unreadDms > 99 ? "99+" : unreadDms}
                  </span>
                )}
              </Link>
            )
          )}
        </div>
      </header>

      <main className="animate-fade-in flex-1 pb-24">{children}</main>

      {!hideCompose && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-30 flex w-full max-w-xl -translate-x-1/2 justify-end px-4">
          <button
            type="button"
            aria-label="新規投稿"
            onClick={() => (userId ? setComposing(true) : navigate({ to: "/auth" }))}
            className="tap pointer-events-auto grid h-14 w-14 place-items-center rounded-full bg-brand text-brand-foreground shadow-lg shadow-brand/25 transition-shadow hover:shadow-xl hover:shadow-brand/35"
          >
            <Feather className="h-6 w-6" />
          </button>
        </div>
      )}

      <nav className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-xl -translate-x-1/2 border-t border-border bg-background/90 backdrop-blur-xl">
        <Link
          to="/"
          className={tabClass}
          activeProps={{ className: "text-foreground [&_svg]:animate-pop [&_svg]:fill-current" }}
          activeOptions={{ exact: true }}
          aria-label="ホーム"
        >
          <Home className="h-6 w-6" />
        </Link>
        <Link
          to="/search"
          className={tabClass}
          activeProps={{ className: "text-foreground [&_svg]:animate-pop" }}
          aria-label="検索"
        >
          <Search className="h-6 w-6" />
        </Link>
        <Link
          to="/activity"
          className={tabClass}
          activeProps={{ className: "text-foreground [&_svg]:animate-pop [&_svg]:fill-current" }}
          aria-label="アクティビティ"
        >
          <span className="relative">
            <Bell className={`h-6 w-6 ${unreadNotifications > 0 ? "text-brand" : ""}`} />
            {unreadNotifications > 0 && (
              <span className="animate-pop absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </span>
            )}
          </span>
        </Link>
        <Link
          to="/me"
          className={tabClass}
          activeProps={{ className: "text-foreground [&_svg]:animate-pop [&_svg]:fill-current" }}
          aria-label="プロフィール"
        >
          <User className="h-6 w-6" />
        </Link>
      </nav>

      {composing && userId && (
        <Composer viewerId={userId} viewerProfile={profile ?? null} onClose={() => setComposing(false)} />
      )}
    </div>
  );
}
