# 004 音楽検索API

Last.fm API（アルバム検索・アーティスト検索）の接続ロジック実装。

依存: なし

## ToDo

- [x] `lib/api/music.ts` を作成する
- [x] Last.fm `album.search` メソッドを呼び出す関数を実装する
- [x] Last.fm `artist.search` メソッドを呼び出す関数を実装する
- [x] APIキーを `.env.local` の `NEXT_PUBLIC_LASTFM_API_KEY` に移動する（requirements.md に記載のキーをそのまま使用）
- [x] レスポンスから `title` / `artist` / カバー画像URLをマッピングする
- [x] 画像URLが空の場合は `null` を返してプレースホルダー表示に委ねる
- [x] 戻り値の型（`MusicItem[]`）を定義する
- [x] 手動テストで検索結果が返ることを確認する
