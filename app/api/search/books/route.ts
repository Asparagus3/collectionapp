import type { BookItem } from "@/lib/api/books";

const FETCH_OPTS = {
  headers: {
    "User-Agent": "MyCollection/1.0 (https://github.com/Asparagus3/collectionapp)",
    "Accept": "application/json",
  },
  signal: AbortSignal.timeout(10000),
  next: { revalidate: 60 },
} as const;

// ── 楽天ブックス API ──────────────────────────────────────────────────────────
type RakutenItem = {
  title: string;
  author: string;
  isbn: string;
  largeImageUrl: string;
  mediumImageUrl: string;
  itemUrl: string;
};

async function searchRakuten(query: string): Promise<BookItem[]> {
  const appId = process.env.RAKUTEN_APP_ID;
  if (!appId) return [];

  const url = new URL("https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404");
  url.searchParams.set("applicationId", appId);
  url.searchParams.set("keyword", query);
  url.searchParams.set("hits", "20");
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), FETCH_OPTS);
  if (!res.ok) return [];

  const data = await res.json() as { Items?: { Item: RakutenItem }[] };

  return (data.Items ?? []).map(({ Item }) => ({
    externalId: Item.isbn || Item.itemUrl,
    externalSource: "rakuten" as const,
    title: Item.title,
    authorArtist: Item.author,
    coverUrl: Item.largeImageUrl || Item.mediumImageUrl || null,
  }));
}

// ── Open Library ──────────────────────────────────────────────────────────────
async function searchOpenLibrary(query: string): Promise<BookItem[]> {
  const url =
    `https://openlibrary.org/search.json` +
    `?q=${encodeURIComponent(query)}&limit=20&fields=key,title,author_name,isbn`;

  const res = await fetch(url, FETCH_OPTS);
  if (!res.ok) return [];

  const data = await res.json() as {
    docs: { key: string; title: string; author_name?: string[]; isbn?: string[] }[];
  };

  return (data.docs ?? []).map((doc) => {
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

// ── Google Books（最終フォールバック） ──────────────────────────────────────────
async function searchGoogleBooks(query: string): Promise<BookItem[]> {
  const url =
    `https://www.googleapis.com/books/v1/volumes` +
    `?q=${encodeURIComponent(query)}&maxResults=20`;

  const res = await fetch(url, FETCH_OPTS);
  if (res.status === 429 || !res.ok) return [];

  const data = await res.json() as {
    items?: {
      id: string;
      volumeInfo: { title: string; authors?: string[]; imageLinks?: { thumbnail?: string } };
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

// ── ルートハンドラ ────────────────────────────────────────────────────────────
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  if (!query) return Response.json({ items: [] });

  // 1. 楽天ブックス（日本語書籍に強い・APIキーが必要）
  const rakutenResults = await searchRakuten(query);
  if (rakutenResults.length > 0) {
    return Response.json({ items: rakutenResults });
  }

  // 2. Open Library（英語書籍・APIキー不要）
  const olResults = await searchOpenLibrary(query);
  if (olResults.length > 0) {
    return Response.json({ items: olResults });
  }

  // 3. Google Books（最終フォールバック・429 でも空配列を返す）
  const gbResults = await searchGoogleBooks(query);
  return Response.json({ items: gbResults });
}
