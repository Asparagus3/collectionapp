import { createClient } from "@/lib/supabase/client";

export type Profile = {
  user_identifier: string;
  display_name: string;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("user_identifier, display_name")
    .eq("user_identifier", userId)
    .single();

  if (error) return null;
  return data as Profile;
}

export async function upsertProfile(
  userId: string,
  displayName: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("profiles").upsert(
    {
      user_identifier: userId,
      display_name: displayName.trim(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_identifier" }
  );
  if (error) throw new Error(`profile upsert failed: ${error.message}`);
}

export async function getAllProfiles(): Promise<
  (Profile & { favorite_count: number })[]
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("user_identifier, display_name");

  if (error || !data) return [];

  // 各ユーザーのお気に入り数を取得
  const counts = await Promise.all(
    data.map(async (p) => {
      const { count } = await supabase
        .from("favorites")
        .select("id", { count: "exact", head: true })
        .eq("user_identifier", p.user_identifier);
      return { ...p, favorite_count: count ?? 0 };
    })
  );

  return counts.sort((a, b) => b.favorite_count - a.favorite_count);
}
