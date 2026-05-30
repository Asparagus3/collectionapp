import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type UserRow = {
  user_identifier: string;
  display_name: string;
  favorite_count: number;
};

async function getUsers(): Promise<UserRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("user_identifier, display_name");

  if (error || !data) return [];

  const withCounts = await Promise.all(
    data.map(async (p) => {
      const { count } = await supabase
        .from("favorites")
        .select("id", { count: "exact", head: true })
        .eq("user_identifier", p.user_identifier);
      return { ...p, favorite_count: count ?? 0 };
    })
  );

  return withCounts.sort((a, b) => b.favorite_count - a.favorite_count);
}

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        ユーザー一覧
      </h1>

      {users.length === 0 && (
        <p className="text-zinc-500 text-sm py-8 text-center">
          まだ表示名を設定したユーザーがいません
        </p>
      )}

      <ul className="space-y-2">
        {users.map((user) => (
          <li key={user.user_identifier}>
            <Link
              href={`/users/${user.user_identifier}`}
              className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
            >
              <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                {user.display_name}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {user.favorite_count} 件
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
