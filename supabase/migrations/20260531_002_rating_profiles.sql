-- favorites に評価・レビューカラムを追加
alter table favorites
  add column rating integer check (rating >= 1 and rating <= 5),
  add column review text;

-- profiles テーブル（匿名UUID → 表示名）
create table profiles (
  user_identifier text primary key,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS 有効化
alter table profiles enable row level security;

-- profiles ポリシー: SELECT は全員可
create policy "profiles_select" on profiles for select using (true);

-- profiles ポリシー: INSERT / UPDATE は全許可（MVP暫定 — Supabase Auth 導入後に user_identifier 検証を追加）
create policy "profiles_insert" on profiles for insert with check (true);
create policy "profiles_update" on profiles for update using (true);
