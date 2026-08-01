import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { SastyLogo } from "@/components/SastyLogo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "ログイン / 新規登録 — sasuty" },
      { name: "description", content: "sasutyにログインして、スレッドの投稿・返信・DMを始めましょう。" },
      { property: "og:title", content: "ログイン / 新規登録 — sasuty" },
      { property: "og:description", content: "メールまたはGoogleでsasutyにサインイン。" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username: username.trim().toLowerCase() },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("確認メールを送信しました。メール内のリンクを開いてください。");
          return;
        }
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Googleサインインに失敗しました");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
      <div className="mb-8 flex flex-col items-center gap-3">
        <SastyLogo className="h-14 w-14 text-foreground" />
        <h1 className="text-2xl font-semibold tracking-tight">sasuty へようこそ</h1>
        <p className="text-sm text-muted-foreground">思ったことを、すぐスレッドに。</p>
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        className="w-full rounded-xl border border-border py-3 text-sm font-semibold"
      >
        Google で続ける
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        または
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "signup" && (
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ユーザー名"
            required
            pattern="[A-Za-z0-9_]{3,20}"
            title="半角英数字とアンダースコア3〜20文字"
            className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-foreground"
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="メールアドレス"
          required
          className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-foreground"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="パスワード"
          required
          minLength={6}
          className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-foreground"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {loading ? "処理中…" : mode === "signin" ? "ログイン" : "アカウント作成"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-5 text-center text-sm text-muted-foreground"
      >
        {mode === "signin" ? "アカウントをお持ちでないですか？ 新規登録" : "すでにアカウントをお持ちですか？ ログイン"}
      </button>
    </div>
  );
}
