import { createClient } from "@/lib/supabase/client";
import type { BookItem } from "@/lib/api/books";
import type { MusicItem } from "@/lib/api/music";

export type CollectionItem = BookItem | MusicItem;

export type AddFavoriteResult =
  | { status: "added"; favoriteId: string }
  | { status: "already_favorited" };

function itemType(source: CollectionItem["externalSource"]): "book" | "music" {
  return source === "lastfm" ? "music" : "book";
}

// Supabase の PostgreSQL ユニーク制約違反エラーコード
const PG_UNIQUE_VIOLATION = "23505";

export async function addFavorite(
  item: CollectionItem,
  userId: string
): Promise<AddFavoriteResult> {
  const supabase = createClient();

  // items upsert — 既存行があれば id を返す
  const { data: itemRow, error: itemError } = await supabase
    .from("items")
    .upsert(
      {
        type: itemType(item.externalSource),
        external_id: item.externalId,
        external_source: item.externalSource,
        title: item.title,
        author_artist: item.authorArtist,
        cover_url: item.coverUrl,
      },
      { onConflict: "external_id,external_source" }
    )
    .select("id")
    .single();

  if (itemError) throw new Error(`items upsert failed: ${itemError.message}`);

  // favorites INSERT
  const { data: favRow, error: favError } = await supabase
    .from("favorites")
    .insert({ item_id: itemRow.id, user_identifier: userId })
    .select("id")
    .single();

  if (favError) {
    if (favError.code === PG_UNIQUE_VIOLATION) {
      return { status: "already_favorited" };
    }
    throw new Error(`favorites insert failed: ${favError.message}`);
  }

  return { status: "added", favoriteId: favRow.id };
}

export async function removeFavorite(
  itemId: string,
  userId: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("item_id", itemId)
    .eq("user_identifier", userId);

  if (error) throw new Error(`favorites delete failed: ${error.message}`);
}

export async function getFavoritedItemIds(userId: string): Promise<Set<string>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("favorites")
    .select("item_id")
    .eq("user_identifier", userId);

  if (error) throw new Error(`favorites fetch failed: ${error.message}`);

  return new Set((data ?? []).map((r) => r.item_id as string));
}

// 検索結果のグレーアウト判定用: "externalSource:externalId" の Set を返す
export async function getFavoritedExternalKeys(
  userId: string
): Promise<Set<string>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("favorites")
    .select("items(external_id, external_source)")
    .eq("user_identifier", userId);

  if (error) throw new Error(`favorites fetch failed: ${error.message}`);

  const keys = new Set<string>();
  for (const row of data ?? []) {
    const item = row.items as unknown as
      | { external_id: string; external_source: string }
      | null;
    if (item) keys.add(`${item.external_source}:${item.external_id}`);
  }
  return keys;
}
