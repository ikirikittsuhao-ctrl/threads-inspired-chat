import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getProfileByUsername } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { ProfileView } from "@/components/ProfileView";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — sasuty` },
      { name: "description", content: `@${params.username} のsasutyプロフィールとスレッド一覧。` },
      { property: "og:title", content: `@${params.username} — sasuty` },
      { property: "og:description", content: `@${params.username} のsasutyプロフィールとスレッド一覧。` },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const profile = useQuery({
    queryKey: ["profile-username", username],
    queryFn: () => getProfileByUsername(username),
  });

  return (
    <AppShell title={`@${username}`}>
      {profile.isLoading ? (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">読み込み中…</p>
      ) : !profile.data ? (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">ユーザーが見つかりません</p>
      ) : (
        <ProfileView profile={profile.data} />
      )}
    </AppShell>
  );
}
