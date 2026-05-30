# 012 評価・レビュー機能

お気に入りアイテムに星1-5の評価とテキストレビューを追加する。

## ToDo

- [x] `favorites` に `rating int` / `review text` カラムを追加するマイグレーションを作成する
- [x] `lib/favorites.ts` に `updateFavoriteRating(favoriteId, rating, review)` を追加する
- [x] `components/StarRating.tsx` を作成する（クリックで1-5評価）
- [x] `app/my/page.tsx` に評価・レビュー入力UIを追加する
- [x] `/users/[userId]` でも評価・レビューを表示する
