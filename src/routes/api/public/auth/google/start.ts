import { createFileRoute } from "@tanstack/react-router";
import { setCookie } from "@tanstack/react-start/server";

export const Route = createFileRoute("/api/public/auth/google/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const clientId = process.env["GOOGLE_CLIENT_ID"];
        if (!clientId) {
          return new Response("GOOGLE_CLIENT_ID is not configured", { status: 500 });
        }

        const url = new URL(request.url);
        const state = crypto.randomUUID();
        setCookie("sasuty_oauth_state", state, {
          httpOnly: true,
          secure: url.protocol === "https:",
          sameSite: "lax",
          path: "/",
          maxAge: 600,
        });

        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("redirect_uri", `${url.origin}/api/public/auth/google/callback`);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", "openid email profile");
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("prompt", "select_account");

        return new Response(null, { status: 302, headers: { location: authUrl.toString() } });
      },
    },
  },
});
