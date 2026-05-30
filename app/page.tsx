import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ItemCard from "@/components/ItemCard";

type Profile = { user_identifier: string; display_name: string };

type FeedRow = {
  id: string;
  user_identifier: string;
  created_at: string;
  items: {
    id: string;
    title: string;
    author_artist: string | null;
    cover_url: string | null;
    type: string;
  } | null;
};

async function getFeed(): Promise<{ feed: FeedRow[]; profiles: Map<string, string> }> {
  const supabase = await createClient();
  const [feedRes, profilesRes] = await Promise.all([
    supabase
      .from("favorites")
      .select("id, user_identifier, created_at, items(id, title, author_artist, cover_url, type)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("profiles").select("user_identifier, display_name"),
  ]);

  if (feedRes.error) throw new Error(`feed fetch failed: ${feedRes.error.message}`);

  const profiles = new Map<string, string>(
    ((profilesRes.data ?? []) as Profile[]).map((p) => [p.user_identifier, p.display_name])
  );

  return { feed: (feedRes.data ?? []) as unknown as FeedRow[], profiles };
}

function shortId(uid: string): string {
  return uid.slice(0, 8);
}

export default async function HomePage() {
  const { feed, profiles } = await getFeed();

  if (feed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-zinc-500">
        <p className="text-lg">まだコレクションがありません</p>
        <Link
          href="/search"
          className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
        >
          最初のアイテムを追加する
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        みんなのコレクション
      </h1>
      <ul className="space-y-3">
        {feed.map((row) => {
          const item = row.items;
          if (!item) return null;
          return (
            <ItemCard
              key={row.id}
              title={item.title}
              authorArtist={item.author_artist}
              coverUrl={item.cover_url}
              type={item.type as "book" | "music"}
              meta={`${profiles.get(row.user_identifier) ?? shortId(row.user_identifier)} が追加`}
              metaHref={`/users/${row.user_identifier}`}
            />
          );
        })}
      </ul>
    </div>
  );
}
