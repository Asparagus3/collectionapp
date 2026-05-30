# 003 本検索API

Open Library API（メイン）と Google Books API（フォールバック）の接続ロジック実装。

依存: なし（APIキー不要）

## ToDo

- [x] `lib/api/books.ts` を作成する
- [x] Open Library 検索エンドポイント `https://openlibrary.org/search.json?q={query}` を呼び出す関数を実装する
- [x] Open Library レスポンスから `title` / `author_name` / `isbn` / カバーURL（`https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg`）をマッピングする
- [x] ISBNが取得できない場合に Google Books API `https://www.googleapis.com/books/v1/volumes?q={query}` にフォールバックする処理を実装する
- [x] Google Books のサムネイルURLが `http://` の場合 `https://` に置換する
- [x] 戻り値の型（`BookItem[]`）を定義する
- [x] Open Library / Google Books 両方で手動テストを行い結果を確認する
