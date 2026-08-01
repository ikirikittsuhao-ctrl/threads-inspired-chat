import { createFileRoute } from "@tanstack/react-router";
import { AppShell, useViewerProfile } from "@/components/AppShell";
import { ProfileView } from "@/components/ProfileView";

export const Route = createFileRoute("/_authenticated/me")({
  head: () => ({
    meta: [
      { title: "マイプロフィール — sasuty" },
      { name: "description", content: "sasutyの自分のプロフィールとスレッドを管理する。" },
      { property: "og:title", content: "マイプロフィール — sasuty" },
      { property: "og:description", content: "sasutyの自分のプロフィールとスレッドを管理する。" },
    ],
  }),
  component: MePage,
});

function MePage() {
  const { data: profile, isLoading } = useViewerProfile();

  return (
    <AppShell title="プロフィール">
      {isLoading || !profile ? (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">読み込み中…</p>
      ) : (
        <ProfileView profile={profile} />
      )}
    </AppShell>
  );
}
