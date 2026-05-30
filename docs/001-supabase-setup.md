# 001 Supabase セットアップ

Supabaseプロジェクトの初期設定とテーブル・RLSポリシーの作成。

## ToDo

- [x] Supabaseプロジェクトを作成する
- [x] `.env.local` に `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定する
- [x] `items` テーブルを作成する（スキーマは requirements.md §6 参照）
- [x] `favorites` テーブルを作成する（スキーマは requirements.md §6 参照）
- [x] `items` にユニーク制約 `(external_id, external_source)` を追加する
- [x] `favorites` にユニーク制約 `(item_id, user_identifier)` を追加する
- [x] `items` の RLS を有効化し、SELECT・INSERT のみ許可するポリシーを設定する
- [x] `favorites` の RLS を有効化し、SELECT・INSERT は全員許可・DELETE は `user_identifier` 一致行のみ許可するポリシーを設定する
- [x] Supabase ダッシュボードから RLS の動作を手動確認する
