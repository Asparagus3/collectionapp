"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ItemCard from "@/components/ItemCard";
import StarRating from "@/components/StarRating";
import { removeFavorite, updateFavoriteRating } from "@/lib/favorites";
import { getProfile, upsertProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import { getUserId } from "@/lib/user";

type MyItem = {
  favoriteId: string;
  itemId: string;
  title: string;
  authorArtist: string | null;
  coverUrl: string | null;
  type: string;
  rating: number | null;
  review: string | null;
};

async function fetchMyCollection(userId: string): Promise<MyItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("favorites")
    .select("id, item_id, rating, review, items(id, title, author_artist, cover_url, type)")
    .eq("user_identifier", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`my collection fetch failed: ${error.message}`);

  return ((data ?? []) as unknown as {
    id: string;
    item_id: string;
    rating: number | null;
    review: string | null;
    items: { id: string; title: string; author_artist: string | null; cover_url: string | null; type: string } | null;
  }[])
    .filter((row) => row.items !== null)
    .map((row) => ({
      favoriteId: row.id,
      itemId: row.item_id,
      title: row.items!.title,
      authorArtist: row.items!.author_artist,
      coverUrl: row.items!.cover_url,
      type: row.items!.type,
      rating: row.rating,
      review: row.review,
    }));
}

function ReviewPanel({
  item,
  onSave,
}: {
  item: MyItem;
  onSave: (favoriteId: string, rating: number | null, review: string | null) => Promise<void>;
}) {
  const [rating, setRating] = useState<number | null>(item.rating);
  const [review, setReview] = useState(item.review ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(item.favoriteId, rating, review || null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 ml-16 space-y-2 pl-4 border-l-2 border-zinc-100 dark:border-zinc-800">
      <StarRating value={rating} onChange={setRating} />
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="レビューを書く（任意）"
        rows={2}
        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-500 resize-none"
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-3 py-1.5 text-xs font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors disabled:opacity-50"
      >
        {saving ? "保存中..." : "保存"}
      </button>
    </div>
  );
}

export default function MyCollectionPage() {
  const [items, setItems] = useState<MyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const uid = getUserId();
    setUserId(uid);
    if (!uid) { setLoading(false); return; }

    Promise.all([
      fetchMyCollection(uid),
      getProfile(uid),
    ]).then(([col, profile]) => {
      setItems(col);
      if (profile) setDisplayName(profile.display_name);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleRemove = useCallback(async (item: MyItem) => {
    if (removingIds.has(item.favoriteId)) return;
    setItems((prev) => prev.filter((i) => i.favoriteId !== item.favoriteId));
    setRemovingIds((prev) => new Set(prev).add(item.favoriteId));
    try {
      await removeFavorite(item.itemId, userId);
    } catch (e) {
      console.error(e);
      setItems((prev) => [item, ...prev]);
    } finally {
      setRemovingIds((prev) => { const n = new Set(prev); n.delete(item.favoriteId); return n; });
    }
  }, [removingIds, userId]);

  const handleSaveRating = useCallback(async (
    favoriteId: string,
    rating: number | null,
    review: string | null,
  ) => {
    await updateFavoriteRating(favoriteId, rating, review);
    setItems((prev) => prev.map((i) =>
      i.favoriteId === favoriteId ? { ...i, rating, review } : i
    ));
    setExpandedId(null);
  }, []);

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setSavingName(true);
    try {
      await upsertProfile(userId, nameInput.trim());
      setDisplayName(nameInput.trim());
      setEditingName(false);
    } catch (e) { console.error(e); }
    finally { setSavingName(false); }
  };

  return (
    <div className="space-y-6">
      {/* プロフィール */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">表示名</p>
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {displayName || "未設定"}
            </p>
          </div>
          <button
            onClick={() => { setEditingName(true); setNameInput(displayName); }}
            className="text-xs text-zinc-500 underline"
          >
            {displayName ? "変更" : "設定する"}
          </button>
        </div>
        {editingName && (
          <div className="flex gap-2">
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              placeholder="表示名を入力"
              maxLength={30}
              className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-zinc-500"
            />
            <button
              onClick={handleSaveName}
              disabled={savingName || !nameInput.trim()}
              className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-3 py-1.5 text-xs font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 disabled:opacity-50"
            >
              {savingName ? "保存中..." : "保存"}
            </button>
            <button onClick={() => setEditingName(false)} className="text-xs text-zinc-400">
              キャンセル
            </button>
          </div>
        )}
        {userId && (
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            あなたのページ:{" "}
            <Link href={`/users/${userId}`} className="underline hover:text-zinc-700">
              /users/{userId.slice(0, 8)}...
            </Link>
          </p>
        )}
      </div>

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
          <Link href="/search" className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 transition-colors">
            検索して追加する
          </Link>
        </div>
      )}

      {!loading && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.favoriteId}>
              <ItemCard
                title={item.title}
                authorArtist={item.authorArtist}
                coverUrl={item.coverUrl}
                type={item.type as "book" | "music"}
                meta={item.rating ? `${"★".repeat(item.rating)}${"☆".repeat(5 - item.rating)}` : undefined}
                action={
                  <div className="flex gap-2">
                    <button
                      onClick={() => setExpandedId(expandedId === item.favoriteId ? null : item.favoriteId)}
                      className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 transition-colors"
                    >
                      {item.rating ? "編集" : "★評価"}
                    </button>
                    <button
                      onClick={() => handleRemove(item)}
                      className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:border-red-300 hover:text-red-500 transition-colors"
                    >
                      削除
                    </button>
                  </div>
                }
              />
              {expandedId === item.favoriteId && (
                <ReviewPanel item={item} onSave={handleSaveRating} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
