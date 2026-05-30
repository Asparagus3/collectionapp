-- favorites の UPDATE ポリシーを追加（rating・review の保存に必要）
create policy "favorites_update" on favorites for update using (true);
