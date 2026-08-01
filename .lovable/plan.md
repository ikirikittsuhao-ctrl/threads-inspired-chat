## sasuty — Threads風SNSアプリ

Threadsの機能ロジックを踏襲したモバイルファーストSNS。名称は「sasuty」、ロゴは「S」をモチーフにしたカスタムSVG。

### バックエンド (Lovable Cloud)
- 認証: メール/パスワード + Google サインイン。`/auth` 画面。
- テーブル:
  - `profiles` (user_id, username一意, display_name, bio, avatar_url, is_private)
  - `posts` (id, user_id, content, image_url, parent_id → 返信スレッド, repost_of_id)
  - `likes` (post_id, user_id 一意)
  - `follows` (follower_id, following_id)
  - `conversations` / `conversation_members` / `messages` (DM)
  - `notifications` (like/reply/follow/mention)
- 全テーブルに GRANT + RLS。roles は別テーブル `user_roles` + `has_role()`。
- 新規登録時トリガーで profiles 自動生成。
- DM・タイムラインは Realtime 購読でライブ更新。

### 画面構成 (Threadsのナビゲーション踏襲)
```text
底部タブ: ホーム / 検索 / 新規投稿 / アクティビティ / プロフィール
　　　　　＋ ヘッダー右にDM
```
- `/` ホームフィード: 「おすすめ」「フォロー中」切替、無限スクロール、投稿カード(アバター・ユーザー名・時刻・本文・画像・返信/リポスト/いいね/共有)
- `/post/$id` スレッド詳細: 親投稿 + インデント付き返信ツリー、インライン返信コンポーザ
- `/compose` モーダル型コンポーザ: テキスト、画像添付、複数投稿を繋げるチェーン投稿
- `/search` ユーザー検索 + おすすめユーザー、フォローボタン
- `/activity` いいね/返信/フォロー通知タブ
- `/@$username` プロフィール: 投稿/返信/リポストタブ、フォロー・プロフィール編集
- `/messages` DM一覧、`/messages/$id` チャット画面(バブルUI、既読、リアルタイム)

### デザイン
- Threads的なモノクロ・高コントラスト・大きな余白のミニマルUI(ダーク基調＋ライト対応)、セマンティックトークンのみ使用。
- ロゴ: 「S」を一筆書き風にデザインしたSVGコンポーネント(`src/components/SastyLogo.tsx`)。スプラッシュ/ヘッダー/認証画面で使用。
- 各ルートに固有の head() メタ(title/description/og)。

### 実装順序
1. Cloud有効化 + スキーマ&RLSマイグレーション、認証画面
2. デザインシステム + ロゴSVG + タブレイアウト
3. 投稿CRUD・フィード・スレッド返信・いいね/リポスト
4. プロフィール・フォロー・検索
5. DM(リアルタイム)
6. 通知・仕上げ

### 技術メモ
- TanStack Start ルート + server functions、TanStack Query で取得/ミューテーション。
- 画像は Cloud Storage バケット `post-media`(公開読取、本人書込)。
- 初期表示用にデモ投稿数件をマイグレーションでシード。
