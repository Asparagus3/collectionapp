export type BookItem = {
  externalId: string;
  externalSource: "openlibrary" | "googlebooks";
  title: string;
  authorArtist: string;
  coverUrl: string | null;
};

// ブラウザ → /api/search/books（サーバーサイド）経由で書籍を検索する
// サーバー側で Open Library / Google Books を試み、両方失敗時も空配列を返す
export async function searchBooks(query: string): Promise<BookItem[]> {
  const res = await fetch(`/api/search/books?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data: { items?: BookItem[] } = await res.json();
  return data.items ?? [];
}
