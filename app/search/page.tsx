"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ItemCard from "@/components/ItemCard";
import { searchBooks } from "@/lib/api/books";
import { searchAlbums, searchArtists } from "@/lib/api/music";
import {
  addFavorite,
  getFavoritedExternalKeys,
  type CollectionItem,
} from "@/lib/favorites";
import { getUserId } from "@/lib/user";

type Tab = "book" | "music";

function externalKey(item: CollectionItem): string {
  return `${item.externalSource}:${item.externalId}`;
}

async function search(tab: Tab, query: string): Promise<CollectionItem[]> {
  if (tab === "book") return searchBooks(query);
  const [albums, artists] = await Promise.all([
    searchAlbums(query),
    searchArtists(query),
  ]);
  // アルバム優先、アーティストは名前重複を除外して末尾に追加
  const seen = new Set(albums.map((a) => a.title.toLowerCase()));
  return [...albums, ...artists.filter((a) => !seen.has(a.title.toLowerCase()))];
}

export default function SearchPage() {
  const [tab, setTab] = useState<Tab>("book");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [favoritedKeys, setFavoritedKeys] = useState<Set<string>>(new Set());
  const [addingKeys, setAddingKeys] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初期ロード: 登録済みキーを取得
  useEffect(() => {
    const userId = getUserId();
    if (!userId) return;
    getFavoritedExternalKeys(userId)
      .then(setFavoritedKeys)
      .catch(console.error);
  }, []);

  // クエリ・タブ変更時にデバウンス検索
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setSearchError(null);
      try {
        const data = await search(tab, query.trim());
        setResults(data);
      } catch (e) {
        console.error(e);
        setSearchError(e instanceof Error ? e.message : "検索に失敗しました");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, tab]);

  const handleAdd = useCallback(
    async (item: CollectionItem) => {
      const key = externalKey(item);
      if (favoritedKeys.has(key) || addingKeys.has(key)) return;

      setAddingKeys((prev) => new Set(prev).add(key));
      try {
        const userId = getUserId();
        const result = await addFavorite(item, userId);
        if (result.status === "added" || result.status === "already_favorited") {
          setFavoritedKeys((prev) => new Set(prev).add(key));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setAddingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [favoritedKeys, addingKeys]
  );

  return (
    <div className="space-y-6">
      {/* タブ */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        {(["book", "music"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setResults([]);
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            {t === "book" ? "本" : "音楽"}
          </button>
        ))}
      </div>

      {/* 検索フォーム */}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={tab === "book" ? "タイトル・著者で検索" : "アルバム・アーティストで検索"}
        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-zinc-500"
      />

      {/* エラー */}
      {searchError && (
        <p className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {searchError}
        </p>
      )}

      {/* ローディング */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
        </div>
      )}

      {/* 検索結果 */}
      {!loading && results.length > 0 && (
        <ul className="space-y-3">
          {results.map((item) => {
            const key = externalKey(item);
            const isFavorited = favoritedKeys.has(key);
            const isAdding = addingKeys.has(key);

            return (
              <ItemCard
                key={key}
                title={item.title}
                authorArtist={item.authorArtist}
                coverUrl={item.coverUrl}
                action={
                  <button
                    onClick={() => handleAdd(item)}
                    disabled={isFavorited || isAdding}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      isFavorited
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-default"
                        : isAdding
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-wait"
                        : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300"
                    }`}
                  >
                    {isFavorited ? "追加済み" : isAdding ? "追加中..." : "追加"}
                  </button>
                }
              />
            );
          })}
        </ul>
      )}

      {/* 空状態 */}
      {!loading && query.trim() && results.length === 0 && (
        <p className="text-center text-sm text-zinc-500 py-8">
          見つかりませんでした
        </p>
      )}
    </div>
  );
}
