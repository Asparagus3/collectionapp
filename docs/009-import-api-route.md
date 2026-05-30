# 009 写真インポート — サーバーAPIルート

Claude Vision API を呼び出す Next.js API Route の実装。

依存: `002`

## ToDo

- [x] `.env.local` に `ANTHROPIC_API_KEY` を設定する
- [x] `@anthropic-ai/sdk` をインストールする
- [x] `app/api/import/route.ts` を作成する（POST）
- [x] リクエストボディから base64 画像データを受け取る
- [x] `claude-sonnet-4-20250514` モデルに画像を送り、写真内の本・CDをJSON配列で返すようプロンプトを設計する
  - 出力形式例: `[{ "type": "book"|"music", "title": "...", "author_artist": "..." }]`
- [x] Claude のレスポンスをパースし、構造化データとして返す
- [x] パース失敗・API エラー時に適切なステータスコードとエラーメッセージを返す
- [x] `ANTHROPIC_API_KEY` が未設定の場合は 500 を返し、クライアントに明示的なエラーメッセージを渡す
