-- items の external_source チェック制約に rakuten を追加
alter table items drop constraint items_external_source_check;
alter table items add constraint items_external_source_check
  check (external_source in ('openlibrary', 'googlebooks', 'lastfm', 'rakuten'));
