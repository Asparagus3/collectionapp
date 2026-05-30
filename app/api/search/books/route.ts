import type { BookItem } from "@/lib/api/books";

const HEADERS = {
  "User-Agent": "MyCollection/1.0 (https://github.com/Asparagus3/collectionapp)",
  "Accept": "application/json",
};

async function searchOpenLibrary(query: string): Promise<BookItem[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20&fields=key,title,author_name,isbn`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Open Library error: ${res.status}`);
  const data = await res.json() as { docs: { key: string; title: string; author_name?: string[]; isbn?: string[] }[] };

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
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Google Books error: ${res.status}`);
  const data = await res.json() as { items?: { id: string; volumeInfo: { title: string; authors?: string[]; imageLinks?: { thumbnail?: string } } }[] };

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
    return Response.json({ error: "q パラメータが必要です" }, { status: 400 });
  }

  try {
    // Open Library を試す
    let results = await searchOpenLibrary(query);
    const withCover = results.filter((r) => r.coverUrl !== null);

    // カバーが少なければ Google Books で補完
    if (withCover.length < 5) {
      try {
        const googleResults = await searchGoogleBooks(query);
        const titles = new Set(results.map((r) => r.title.toLowerCase()));
        const extra = googleResults.filter((r) => !titles.has(r.title.toLowerCase()));
        results = [...results, ...extra];
      } catch {
        // Google Books も失敗した場合は Open Library の結果だけ返す
      }
    }

    return Response.json({ items: results });
  } catch {
    // Open Library 失敗時は Google Books のみで試みる
    try {
      const results = await searchGoogleBooks(query);
      return Response.json({ items: results });
    } catch (e) {
      const message = e instanceof Error ? e.message : "不明なエラー";
      return Response.json({ error: `書籍検索に失敗しました: ${message}` }, { status: 502 });
    }
  }
}
