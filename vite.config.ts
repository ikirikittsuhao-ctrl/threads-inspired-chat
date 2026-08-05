// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Render.com などセルフホスト環境向け: Lovable のビルド外では Node サーバー出力にする
  // (Lovable 内ではプラットフォーム側で Cloudflare 出力が強制されるため影響なし)
  nitro: { preset: "node" },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    // 公開キーはクライアントに埋め込まれる前提の値。ビルド環境で VITE_* が未設定でも
    // 空文字にならないようフォールバックを定義する。
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        process.env["VITE_SUPABASE_URL"] || "https://widvwxbikpofqgojnzuy.supabase.co",
      ),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
          "sb_publishable_-NjcB_JxG6lWs3-Qv5_2dg_SEE8oO6I",
      ),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(
        process.env["VITE_SUPABASE_PROJECT_ID"] || "widvwxbikpofqgojnzuy",
      ),
    },
    server: {
      allowedHosts: [
        "threads-inspired-chat.onrender.com",
      ],
    },
    preview: {
      allowedHosts: [
        "threads-inspired-chat.onrender.com",
      ],
    },
  },
});
