# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical: Non-standard Next.js version

This project uses **Next.js 16.2.6**, which has breaking changes from prior versions. APIs, conventions, and file structure may all differ from your training data. Before writing any Next.js-specific code, read the relevant guide in `node_modules/next/dist/docs/`. Heed deprecation notices.

## Commands

```bash
npm run dev      # start dev server at http://localhost:3000
npm run build    # production build
npm run lint     # ESLint
```

No test framework is configured.

## Stack

- **Next.js 16** with App Router (`app/` directory)
- **React 19**
- **Tailwind CSS v4** (configured via `@tailwindcss/postcss`, not the v3 `tailwind.config.js` pattern)
- **TypeScript**

## Node.js best practices

- **環境変数**: シークレット・設定値は必ず `.env.local` で管理し、コードにハードコードしない。クライアントに公開してよい値のみ `NEXT_PUBLIC_` プレフィックスを付ける。
- **非同期処理**: コールバックは使わず `async/await` で統一する。`Promise` チェーンも避ける。
- **エラーハンドリング**: 非同期関数は必ず `try/catch` でラップし、エラーを握り潰さない。API Route では適切な HTTP ステータスコードを返す。
- **型安全**: `any` は使わない。外部APIレスポンスには `unknown` を受けて型ガードで絞り込む。
- **import**: 相対パスは `../../` のような深いネストを避け、`tsconfig.json` のパスエイリアス（`@/`）を使う。
- **Server / Client 境界**: Anthropic APIキーなど秘匿情報を扱う処理は必ず Server Component または API Route に置き、`"use client"` コンポーネントから直接呼ばない。
- **依存パッケージ**: `npm install` は必要最小限に留める。ユーティリティ1関数のためにパッケージを追加しない。

## Supabase

### パッケージ
```bash
npm install @supabase/supabase-js @supabase/ssr
```

### クライアントの使い分け

`lib/supabase/` 以下に3ファイルを置く:

| ファイル | 用途 | Cookie操作 |
|---------|------|-----------|
| `client.ts` | Client Component | `createBrowserClient`（`document.cookie` 自動処理） |
| `server.ts` | Server Component / Route Handler | `createServerClient` + `next/headers` の `cookies()` |
| `middleware.ts` | `middleware.ts` | `createServerClient` + `NextRequest.cookies` |

`"use client"` コンポーネントでは `client.ts`、Server Component・API Route では `server.ts` を使う。混用しない。

### ミドルウェア

セッション更新のため、`middleware.ts` で必ず `await supabase.auth.getUser()` を呼ぶ。この1行がアクセストークンの期限チェックと自動リフレッシュを行う。

### RLS ポリシー

テーブル作成後に必ず `alter table <table> enable row level security;` を実行する。ポリシーなしで RLS を有効化するとすべての行が非表示になる。匿名ID（`user_identifier` カラム）で絞り込む場合は `using (user_identifier = current_setting('request.jwt.claims', true)::json->>'sub')` ではなく、アプリ側で渡した値と照合する形で設計する。

### 環境変数

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

両方 `NEXT_PUBLIC_` で公開してよい（anon key はフロントから使う前提の公開鍵）。シークレットが必要な操作は Service Role Key を使い、必ずサーバーサイドのみで実行する。

## Architecture

Single-page Next.js app using the App Router. Entry points:

- `app/layout.tsx` — root layout; loads Geist fonts via `next/font/google`, sets `<html>` and `<body>` structure
- `app/page.tsx` — home page (`/`)
- `app/globals.css` — global styles imported by the root layout
