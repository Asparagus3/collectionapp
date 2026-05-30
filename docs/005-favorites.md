# 005 お気に入り機能

お気に入りの追加・削除ロジックと Supabase への読み書き。

依存: `001` `002`

## ToDo

- [x] `lib/favorites.ts` を作成する
- [x] アイテム追加時に `items` テーブルへ upsert する関数を実装する（`(external_id, external_source)` でユニーク判定）
- [x] `favorites` テーブルへ INSERT する関数を実装する（匿名UUIDを `user_identifier` として渡す）
- [x] `favorites` テーブルから DELETE する関数を実装する（`user_identifier` 一致行のみ）
- [x] 自分がお気に入り登録済みかどうかを判定する関数を実装する
- [x] 重複登録時（ユニーク制約エラー）を握り潰さず、UI側で「追加済み」として扱う
