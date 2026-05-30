"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ItemCard from "@/components/ItemCard";
import { removeFavorite } from "@/lib/favorites";
import { createClient } from "@/lib/supabase/client";
import { getUserId } from "@/lib/user";

type MyItem = {
  favoriteId: string;
  itemId: string;
  title: string;
  authorArtist: string | null;
  coverUrl: string | null;
  type: string;
};

async function fetchMyCollection(userId: string): Promise<MyItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("favorites")
    .select("id, item_id, items(id, title, author_artist, cover_url, type)")
    .eq("user_identifier", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`my collection fetch failed: ${error.message}`);

  return ((data ?? []) as unknown as {
    id: string;
    item_id: string;
    items: {
      id: string;
      title: string;
      author_artist: string | null;
      cover_url: string | null;
      type: string;
    } | null;
  }[])
    .filter((row) => row.items !== null)
    .map((row) => ({
      favoriteId: row.id,
      itemId: row.item_id,
      title: row.items!.title,
      authorArtist: row.items!.author_artist,
      coverUrl: row.items!.cover_url,
      type: row.items!.type,
    }));
}

export default function MyCollectionPage() {
  const [items, setItems] = useState<MyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const userId = getUserId();
    if (!userId) {
      setLoading(false);
      return;
    }
    fetchMyCollection(userId)
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = useCallback(
    async (item: MyItem) => {
      if (removingIds.has(item.favoriteId)) return;
      setItems((prev) => prev.filter((i) => i.favoriteId !== item.favoriteId));
      setRemovingIds((prev) => new Set(prev).add(item.favoriteId));
      try {
        const userId = getUserId();
        await removeFavorite(item.itemId, userId);
      } catch (e) {
        console.error(e);
        setItems((prev) => [item, ...prev]);
      } finally {
        setRemovingIds((prev) => {
          const next = new Set(prev);
          next.delete(item.favoriteId);
          return next;
        });
      }
    },
    [removingIds]
  );

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        マイコレクション
      </h1>

      <p className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
        コレクションはこのブラウザの localStorage に紐づいています。データを消去するとコレクションは引き継げません。
      </p>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-zinc-500">
          <p>まだアイテムがありません</p>
          <Link
            href="/search"
            className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
          >
            検索して追加する
          </Link>
        </div>
      )}

      {!loading && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => (
            <ItemCard
              key={item.favoriteId}
              title={item.title}
              authorArtist={item.authorArtist}
              coverUrl={item.coverUrl}
              type={item.type as "book" | "music"}
              action={
                <button
                  onClick={() => handleRemove(item)}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:border-red-300 hover:text-red-500 dark:hover:border-red-700 dark:hover:text-red-400 transition-colors"
                >
                  削除
                </button>
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
