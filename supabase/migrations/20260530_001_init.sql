-- items テーブル
create table items (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('book', 'music')),
  external_id text not null,
  external_source text not null check (external_source in ('openlibrary', 'googlebooks', 'lastfm')),
  title text not null,
  author_artist text,
  cover_url text,
  created_at timestamptz not null default now(),
  constraint items_external_unique unique (external_id, external_source)
);

-- favorites テーブル
create table favorites (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items (id) on delete cascade,
  user_identifier text not null,
  created_at timestamptz not null default now(),
  constraint favorites_unique unique (item_id, user_identifier)
);

-- インデックス（フィード取得・マイコレクション取得を高速化）
create index favorites_created_at_idx on favorites (created_at desc);
create index favorites_user_idx on favorites (user_identifier);

-- RLS 有効化
alter table items enable row level security;
alter table favorites enable row level security;

-- items ポリシー: 全員 SELECT・INSERT 可。UPDATE・DELETE 不可
create policy "items_select" on items for select using (true);
create policy "items_insert" on items for insert with check (true);

-- favorites ポリシー: SELECT・INSERT は全員可
create policy "favorites_select" on favorites for select using (true);
create policy "favorites_insert" on favorites for insert with check (true);

-- favorites ポリシー: DELETE は全許可（MVP暫定）
-- 認証なし匿名IDモデルのため RLS では user_identifier を検証できない。
-- アプリ側で必ず user_identifier を WHERE 条件に含めて削除すること。
-- 本番移行時は Supabase Auth + auth.uid() ベースのポリシーに差し替える。
create policy "favorites_delete" on favorites for delete using (true);
