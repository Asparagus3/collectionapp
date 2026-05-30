export type BookItem = {
  externalId: string;
  externalSource: "openlibrary" | "googlebooks";
  title: string;
  authorArtist: string;
  coverUrl: string | null;
};

async function searchOpenLibrary(query: string): Promise<BookItem[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20&fields=key,title,author_name,isbn`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Open Library: ${res.status}`);
  const data = await res.json() as {
    docs: { key: string; title: string; author_name?: string[]; isbn?: string[] }[];
  };

  return data.docs.map((doc) => {
    const isbn = doc.isbn?.[0] ?? null;
    return {
      externalId: doc.key,
      externalSource: "openlibrary" as const,
      title: doc.title,
      authorArtist: doc.author_name?.[0] ?? "",
      coverUrl: isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg` : null,
    };
  });
}

async function searchGoogleBooks(query: string): Promise<BookItem[]> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Google Books: ${res.status}`);
  const data = await res.json() as {
    items?: { id: string; volumeInfo: { title: string; authors?: string[]; imageLinks?: { thumbnail?: string } } }[];
  };

  return (data.items ?? []).map((vol) => {
    const thumbnail = vol.volumeInfo.imageLinks?.thumbnail ?? null;
    return {
      externalId: vol.id,
      externalSource: "googlebooks" as const,
      title: vol.volumeInfo.title,
      authorArtist: vol.volumeInfo.authors?.[0] ?? "",
      coverUrl: thumbnail ? thumbnail.replace(/^http:\/\//, "https://") : null,
    };
  });
}

// ブラウザから直接 Open Library を呼ぶ（CORS対応済み）
// → Vercel 共有IP のブロックを回避し、ユーザー各自のIPでアクセス
export async function searchBooks(query: string): Promise<BookItem[]> {
  try {
    const results = await searchOpenLibrary(query);
    if (results.length > 0) return results;
  } catch {
    // Open Library 失敗 → Google Books にフォールバック
  }

  return searchGoogleBooks(query);
}
