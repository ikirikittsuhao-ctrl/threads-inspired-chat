import { createFileRoute } from "@tanstack/react-router";
import { deleteCookie, getCookie } from "@tanstack/react-start/server";

function decodeIdToken(idToken: string): {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
} {
  const payload = idToken.split(".")[1];
  if (!payload) return {};
  const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(json) as Record<string, never>;
}

function fail(origin: string, message: string) {
  const url = new URL("/auth", origin);
  url.searchParams.set("error", message);
  return new Response(null, { status: 302, headers: { location: url.toString() } });
}

export const Route = createFileRoute("/api/public/auth/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = url.origin;
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const expectedState = getCookie("sasuty_oauth_state");
        deleteCookie("sasuty_oauth_state", { path: "/" });

        if (!code) return fail(origin, "Googleサインインがキャンセルされました");
        if (!state || !expectedState || state !== expectedState) {
          return fail(origin, "セッションの検証に失敗しました");
        }

        const clientId = process.env["GOOGLE_CLIENT_ID"];
        const clientSecret = process.env["GOOGLE_CLIENT_SECRET"];
        if (!clientId || !clientSecret) return fail(origin, "Googleの設定が未完了です");

        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: `${origin}/api/public/auth/google/callback`,
            grant_type: "authorization_code",
          }),
        });
        if (!tokenRes.ok) return fail(origin, "Googleとの通信に失敗しました");

        const tokens = (await tokenRes.json()) as { id_token?: string };
        if (!tokens.id_token) return fail(origin, "Googleの応答が不正です");

        const claims = decodeIdToken(tokens.id_token);
        if (!claims.email || claims.email_verified === false) {
          return fail(origin, "Googleアカウントのメールを確認できませんでした");
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const created = await supabaseAdmin.auth.admin.createUser({
          email: claims.email,
          email_confirm: true,
          user_metadata: {
            display_name: claims.name ?? "",
            avatar_url: claims.picture ?? "",
            username: claims.email.split("@")[0],
          },
        });
        if (created.error && !/already/i.test(created.error.message)) {
          return fail(origin, "アカウントの作成に失敗しました");
        }

        const link = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: claims.email,
        });
        const hashedToken = link.data?.properties?.hashed_token;
        if (link.error || !hashedToken) return fail(origin, "サインインに失敗しました");

        const dest = new URL("/auth/callback", origin);
        dest.searchParams.set("token_hash", hashedToken);
        return new Response(null, { status: 302, headers: { location: dest.toString() } });
      },
    },
  },
});
