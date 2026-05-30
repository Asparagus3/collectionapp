# 002 プロジェクト基盤

Supabaseクライアント、匿名UUID管理、グローバルレイアウト・ナビゲーションの実装。

依存: `001`

## ToDo

- [x] `@supabase/supabase-js` と `@supabase/ssr` をインストールする
- [x] `lib/supabase/client.ts` を作成する（`createBrowserClient`）
- [x] `lib/supabase/server.ts` を作成する（`createServerClient` + `next/headers`）
- [x] `lib/user.ts` を作成する — `localStorage` の匿名UUID（UUID v4）の生成・取得ロジック
- [x] `uuid` パッケージをインストールし型定義も追加する
- [x] `app/layout.tsx` にグローバルナビゲーションを追加する（ホーム / 検索 / インポート / マイコレクション）
- [x] ナビゲーションが各ページパス（`/` `/search` `/import` `/my`）にリンクしていることを確認する
