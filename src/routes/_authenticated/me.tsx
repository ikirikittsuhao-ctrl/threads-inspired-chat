import { createFileRoute } from "@tanstack/react-router";
import { AppShell, useViewerProfile } from "@/components/AppShell";
import { ProfileSkeleton } from "@/components/skeletons/Skeletons";
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
        <ProfileSkeleton />
      ) : (
        <ProfileView profile={profile} />
      )}
    </AppShell>
  );
}
