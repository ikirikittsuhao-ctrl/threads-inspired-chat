import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Home, PenSquare, Search, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getProfileById } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { SastyLogo } from "./SastyLogo";
import { Composer } from "./Composer";

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
}

export function AppShell({ children, title, right }: Props) {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const { data: profile } = useViewerProfile();
  const [composing, setComposing] = useState(false);

  const tabClass = "flex flex-1 items-center justify-center py-3 text-muted-foreground transition-colors";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <Link to="/" className="flex items-center gap-2">
          <SastyLogo className="h-7 w-7 text-foreground" />
          <span className="text-lg font-semibold tracking-tight">{title ?? "sasuty"}</span>
        </Link>
        <div className="flex items-center gap-3">{right}</div>
      </header>

      <main className="flex-1 pb-20">{children}</main>

      <nav className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-xl -translate-x-1/2 border-t border-border bg-background/95 backdrop-blur">
        <Link to="/" className={tabClass} activeProps={{ className: "text-foreground" }} activeOptions={{ exact: true }} aria-label="ホーム">
          <Home className="h-6 w-6" />
        </Link>
        <Link to="/search" className={tabClass} activeProps={{ className: "text-foreground" }} aria-label="検索">
          <Search className="h-6 w-6" />
        </Link>
        <button
          type="button"
          aria-label="新規投稿"
          className={tabClass}
          onClick={() => (userId ? setComposing(true) : navigate({ to: "/auth" }))}
        >
          <PenSquare className="h-6 w-6" />
        </button>
        <Link to="/activity" className={tabClass} activeProps={{ className: "text-foreground" }} aria-label="アクティビティ">
          <Bell className="h-6 w-6" />
        </Link>
        <Link to="/me" className={tabClass} activeProps={{ className: "text-foreground" }} aria-label="プロフィール">
          <User className="h-6 w-6" />
        </Link>
      </nav>

      {composing && userId && (
        <Composer viewerId={userId} viewerProfile={profile ?? null} onClose={() => setComposing(false)} />
      )}
    </div>
  );
}
