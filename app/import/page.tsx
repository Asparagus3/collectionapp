"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Placeholder from "@/components/Placeholder";
import { searchBooks } from "@/lib/api/books";
import { searchAlbums } from "@/lib/api/music";
import { addFavorite, type CollectionItem } from "@/lib/favorites";
import { getUserId } from "@/lib/user";
import type { DetectedItem } from "@/app/api/import/route";

type MatchedItem = {
  detected: DetectedItem;
  matched: CollectionItem | null;
  selected: boolean;
};

type Phase = "idle" | "analyzing" | "confirming";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // "data:image/jpeg;base64,XXXX" → "XXXX"
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function validMediaType(
  type: string
): "image/jpeg" | "image/png" | "image/webp" | "image/gif" | null {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
  return allowed.includes(type as (typeof allowed)[number])
    ? (type as (typeof allowed)[number])
    : null;
}

async function matchItem(detected: DetectedItem): Promise<CollectionItem | null> {
  try {
    if (detected.type === "book") {
      const query = [detected.title, detected.author_artist].filter(Boolean).join(" ");
      const results = await searchBooks(query);
      return results[0] ?? null;
    } else {
      const query = [detected.title, detected.author_artist].filter(Boolean).join(" ");
      const results = await searchAlbums(query);
      return results[0] ?? null;
    }
  } catch {
    return null;
  }
}

export default function ImportPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<MatchedItem[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    const mediaType = validMediaType(file.type);
    if (!mediaType) {
      setError("JPEG・PNG・WebP・GIF のみ対応しています");
      return;
    }

    setError(null);
    setItems([]);
    setPreviewUrl(URL.createObjectURL(file));
    setPhase("analyzing");

    try {
      const base64 = await fileToBase64(file);

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mediaType }),
      });

      const data: { items?: DetectedItem[]; error?: string } = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error ?? `サーバーエラー (${res.status})`);
      }

      const detected = data.items ?? [];
      if (detected.length === 0) {
        setError("本・CDが検出されませんでした。別の写真をお試しください。");
        setPhase("idle");
        return;
      }

      // 並列で外部 API 照合
      const matched = await Promise.all(
        detected.map(async (d) => ({
          detected: d,
          matched: await matchItem(d),
          selected: true,
        }))
      );
      setItems(matched);
      setPhase("confirming");
    } catch (e) {
      setError(e instanceof Error ? e.message : "解析に失敗しました");
      setPhase("idle");
    }
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  const toggleSelect = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleAdd = async () => {
    const userId = getUserId();
    const targets = items.filter((i) => i.selected && i.matched !== null);
    if (targets.length === 0) return;

    setIsAdding(true);
    try {
      await Promise.all(
        targets.map((i) => addFavorite(i.matched!, userId))
      );
      router.push("/my");
    } catch (e) {
      setError(e instanceof Error ? e.message : "追加に失敗しました");
      setIsAdding(false);
    }
  };

  const selectedCount = items.filter((i) => i.selected && i.matched).length;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        写真インポート
      </h1>

      {/* アップロードエリア */}
      {phase === "idle" && (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 py-16 text-center transition-colors hover:border-zinc-500 dark:hover:border-zinc-500"
        >
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            写真を選択またはカメラで撮影
          </p>
          <p className="mt-1 text-xs text-zinc-400">JPEG / PNG / WebP / GIF</p>
        </button>
      )}

      {/* プレビュー + 再選択 */}
      {phase !== "idle" && previewUrl && (
        <div className="space-y-3">
          <div className="relative h-48 w-full overflow-hidden rounded-xl">
            <Image
              src={previewUrl}
              alt="アップロード画像"
              fill
              className="object-contain bg-zinc-100 dark:bg-zinc-900"
              unoptimized
            />
          </div>
          {phase === "confirming" && (
            <button
              onClick={() => {
                setPhase("idle");
                setItems([]);
                setPreviewUrl(null);
                inputRef.current?.click();
              }}
              className="text-xs text-zinc-500 underline"
            >
              別の写真を選ぶ
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
      />

      {/* 解析中 */}
      {phase === "analyzing" && (
        <div className="flex flex-col items-center gap-3 py-8 text-zinc-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
          <p className="text-sm">解析中...</p>
        </div>
      )}

      {/* エラー */}
      {error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 検出結果一覧 */}
      {phase === "confirming" && items.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {items.length} 件検出されました。追加するアイテムを選択してください。
          </p>
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li
                key={index}
                className={`flex items-center gap-4 rounded-xl border p-3 transition-colors ${
                  item.selected
                    ? "border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900"
                    : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 opacity-50"
                }`}
              >
                {/* チェックボックス */}
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={() => toggleSelect(index)}
                  className="h-4 w-4 flex-none accent-zinc-900 dark:accent-zinc-100"
                />

                {item.matched ? (
                  <>
                    {/* カバー画像 */}
                    <div className="relative h-16 w-12 flex-none overflow-hidden rounded">
                      {item.matched.coverUrl ? (
                        <Image
                          src={item.matched.coverUrl}
                          alt={item.matched.title}
                          fill
                          className="object-cover"
                          sizes="48px"
                          unoptimized
                        />
                      ) : (
                        <Placeholder
                          title={item.matched.title}
                          className="h-full w-full text-xl"
                        />
                      )}
                    </div>
                    {/* テキスト */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {item.matched.title}
                      </p>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {item.matched.authorArtist}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* 照合失敗 */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {item.detected.title}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        照合できませんでした
                      </p>
                    </div>
                    <Link
                      href={`/search?q=${encodeURIComponent(item.detected.title)}`}
                      className="flex-none text-xs text-zinc-500 underline"
                    >
                      手動で検索
                    </Link>
                  </>
                )}
              </li>
            ))}
          </ul>

          <button
            onClick={handleAdd}
            disabled={selectedCount === 0 || isAdding}
            className={`w-full rounded-lg py-3 text-sm font-medium transition-colors ${
              selectedCount === 0
                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-default"
                : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300"
            }`}
          >
            {isAdding
              ? "追加中..."
              : `${selectedCount} 件をコレクションに追加する`}
          </button>
        </div>
      )}
    </div>
  );
}
