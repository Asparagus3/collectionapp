import type { BookItem } from "@/lib/api/books";

const HEADERS = {
  "User-Agent": "MyCollection/1.0 (https://github.com/Asparagus3/collectionapp)",
  "Accept": "application/json",
};

async function searchOpenLibrary(query: string): Promise<BookItem[] | null> {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20&fields=key,title,author_name,isbn`;
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;

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
  } catch {
    return null;
  }
}

async function searchGoogleBooks(query: string): Promise<BookItem[] | "rate_limited"> {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20`;
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });

    if (res.status === 429) return "rate_limited";
    if (!res.ok) return [];

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
  } catch {
    return [];
  }
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return Response.json({ error: "q パラメータが必要です" }, { status: 400 });
  }

  // 1. Open Library を試す（タイムアウト付き）
  const olResults = await searchOpenLibrary(query);

  // Open Library が1件以上返した場合はそのまま返す（Google Books を呼ばない）
  if (olResults && olResults.length > 0) {
    return Response.json({ items: olResults });
  }

  // 2. Open Library が 0件 or 失敗した場合のみ Google Books を試す
  const gbResults = await searchGoogleBooks(query);

  if (gbResults === "rate_limited") {
    // Open Library の結果が空でも返す（検索自体は成功扱い）
    return Response.json({
      items: olResults ?? [],
      warning: "Google Books の利用制限に達しました。Open Library の結果のみ表示しています。",
    });
  }

  return Response.json({ items: gbResults });
}
