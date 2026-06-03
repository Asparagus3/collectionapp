import type { BookItem } from "@/lib/api/books";

const FETCH_OPTS = {
  headers: {
    "User-Agent": "MyCollection/1.0 (https://github.com/Asparagus3/collectionapp)",
    "Accept": "application/json",
  },
  signal: AbortSignal.timeout(10000),
  next: { revalidate: 60 },
} as const;

// ── CiNii Books（国立情報学研究所）────────────────────────────────────────────
// APIキー不要・日本語書籍に強い・JSON形式
type CiNiiItem = {
  title: string;
  "dc:creator"?: string;
  "dcterms:hasPart"?: { "@id": string }[];
  link?: { "@id": string };
};

async function searchCiNii(query: string): Promise<BookItem[]> {
  const url =
    `https://ci.nii.ac.jp/books/opensearch/search` +
    `?title=${encodeURIComponent(query)}&format=json&count=20`;

  const res = await fetch(url, FETCH_OPTS);
  if (!res.ok) return [];

  const data = await res.json() as {
    "@graph": [{ items?: CiNiiItem[] }];
  };

  const items = data["@graph"]?.[0]?.items ?? [];

  return items.flatMap((item): BookItem[] => {
    const isbns = (item["dcterms:hasPart"] ?? [])
      .map((p) => p["@id"].replace("urn:isbn:", ""))
      .filter((s) => /^\d{9,13}[\dX]?$/.test(s.replace(/-/g, "")));

    const isbn = isbns[0] ?? null;
    const ncid = item.link?.["@id"]?.split("/").pop() ?? item.title;

    return [{
      externalId: ncid,
      externalSource: "openlibrary", // Open Library のカバーURLを使うため同じソース扱い
      title: item.title,
      authorArtist: (item["dc:creator"] ?? "").replace(/著$/, "").replace(/他$/, "").trim(),
      coverUrl: isbn
        ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
        : null,
    }];
  });
}

// ── Open Library（英語書籍フォールバック）──────────────────────────────────────
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

// ── ルートハンドラ ────────────────────────────────────────────────────────────
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  if (!query) return Response.json({ items: [] });

  // 1. CiNii Books（日本語書籍に最適・APIキー不要）
  const ciNiiResults = await searchCiNii(query);
  if (ciNiiResults.length > 0) {
    return Response.json({ items: ciNiiResults });
  }

  // 2. Open Library（英語書籍・フォールバック）
  const olResults = await searchOpenLibrary(query);
  return Response.json({ items: olResults });
}
