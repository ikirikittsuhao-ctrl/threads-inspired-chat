import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "サインイン処理中 — sasuty" },
      { name: "description", content: "sasutyのサインインを完了しています。" },
      { property: "og:title", content: "サインイン処理中 — sasuty" },
      { property: "og:description", content: "sasutyのサインインを完了しています。" },
    ],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tokenHash = new URLSearchParams(window.location.search).get("token_hash");
    if (!tokenHash) {
      setError("サインイン情報が見つかりませんでした");
      return;
    }
    void supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash }).then(({ error }) => {
      if (error) {
        setError(error.message);
        return;
      }
      void navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-muted-foreground">
      {error ?? "サインインしています…"}
    </div>
  );
}
