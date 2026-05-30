import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ItemCard from "@/components/ItemCard";
import StarRating from "@/components/StarRating";

type FavoriteRow = {
  id: string;
  rating: number | null;
  review: string | null;
  items: {
    title: string;
    author_artist: string | null;
    cover_url: string | null;
    type: string;
  } | null;
};

async function getUserCollection(userId: string) {
  const supabase = await createClient();

  const [profileRes, favRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_identifier", userId)
      .single(),
    supabase
      .from("favorites")
      .select("id, rating, review, items(title, author_artist, cover_url, type)")
      .eq("user_identifier", userId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    displayName: (profileRes.data as { display_name: string } | null)?.display_name ?? null,
    favorites: (favRes.data ?? []) as unknown as FavoriteRow[],
  };
}

export default async function UserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { displayName, favorites } = await getUserCollection(userId);

  if (!displayName && favorites.length === 0) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {displayName ?? `${userId.slice(0, 8)}...`} のコレクション
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {favorites.length} 件
        </p>
      </div>

      {favorites.length === 0 && (
        <p className="text-zinc-500 text-sm py-8 text-center">
          まだコレクションがありません
        </p>
      )}

      <ul className="space-y-3">
        {favorites.map((fav) => {
          const item = fav.items;
          if (!item) return null;
          return (
            <li key={fav.id} className="space-y-2">
              <ItemCard
                title={item.title}
                authorArtist={item.author_artist}
                coverUrl={item.cover_url}
                type={item.type as "book" | "music"}
              />
              {(fav.rating || fav.review) && (
                <div className="ml-16 pl-4 border-l-2 border-zinc-100 dark:border-zinc-800 space-y-1">
                  {fav.rating && (
                    <StarRating value={fav.rating} readonly size="sm" />
                  )}
                  {fav.review && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {fav.review}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
