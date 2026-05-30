import type { BookItem } from "@/lib/api/books";

const REQUEST_HEADERS = {
  "User-Agent": "MyCollection/1.0 (https://github.com/Asparagus3/collectionapp)",
  "Accept": "application/json",
  "Accept-Language": "ja,en;q=0.9",
};

async function searchOpenLibrary(query: string): Promise<BookItem[]> {
  const url =
    `https://openlibrary.org/search.json` +
    `?q=${encodeURIComponent(query)}&limit=20&fields=key,title,author_name,isbn`;

  const res = await fetch(url, {
    headers: REQUEST_HEADERS,
    signal: AbortSignal.timeout(10000),
    // Vercel Edge キャッシュを使い、同一クエリの連続リクエストを削減
    next: { revalidate: 60 },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as {
    docs: { key: string; title: string; author_name?: string[]; isbn?: string[] }[];
  };

  return (data.docs ?? []).map((doc) => {
    const isbn = doc.isbn?.[0] ?? null;
    return {
      externalId: doc.key,
      externalSource: "openlibrary" as const,
      title: doc.title,
      authorArtist: doc.author_name?.[0] ?? "",
      coverUrl: isbn
        ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
        : null,
    };
  });
}

async function searchGoogleBooks(query: string): Promise<BookItem[]> {
  const url =
    `https://www.googleapis.com/books/v1/volumes` +
    `?q=${encodeURIComponent(query)}&maxResults=20`;

  const res = await fetch(url, {
    headers: REQUEST_HEADERS,
    signal: AbortSignal.timeout(10000),
    next: { revalidate: 60 },
  });

  // 429 はエラーにせず空配列で握り潰す
  if (res.status === 429 || !res.ok) return [];

  const data = (await res.json()) as {
    items?: {
      id: string;
      volumeInfo: {
        title: string;
        authors?: string[];
        imageLinks?: { thumbnail?: string };
      };
    }[];
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

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return Response.json({ items: [] });
  }

  // Open Library を優先
  const olResults = await searchOpenLibrary(query);
  if (olResults.length > 0) {
    return Response.json({ items: olResults });
  }

  // OL が 0件のときのみ Google Books（429 でも空配列が返るので安全）
  const gbResults = await searchGoogleBooks(query);
  return Response.json({ items: gbResults });
}
