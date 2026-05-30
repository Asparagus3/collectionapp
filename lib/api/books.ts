export type BookItem = {
  externalId: string;
  externalSource: "openlibrary" | "googlebooks";
  title: string;
  authorArtist: string;
  coverUrl: string | null;
};

type OpenLibraryDoc = {
  key: string;
  title: string;
  author_name?: string[];
  isbn?: string[];
};

type OpenLibraryResponse = {
  docs: OpenLibraryDoc[];
};

type GoogleBooksVolume = {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    imageLinks?: { thumbnail?: string };
  };
};

type GoogleBooksResponse = {
  items?: GoogleBooksVolume[];
};

function openLibraryCoverUrl(isbn: string): string {
  return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
}

async function searchOpenLibrary(query: string): Promise<BookItem[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20&fields=key,title,author_name,isbn`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open Library error: ${res.status}`);
  const data: OpenLibraryResponse = await res.json();

  return data.docs.map((doc) => {
    const isbn = doc.isbn?.[0] ?? null;
    return {
      externalId: doc.key,
      externalSource: "openlibrary",
      title: doc.title,
      authorArtist: doc.author_name?.[0] ?? "",
      coverUrl: isbn ? openLibraryCoverUrl(isbn) : null,
    };
  });
}

async function searchGoogleBooks(query: string): Promise<BookItem[]> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Books error: ${res.status}`);
  const data: GoogleBooksResponse = await res.json();

  return (data.items ?? []).map((vol) => {
    const thumbnail = vol.volumeInfo.imageLinks?.thumbnail ?? null;
    return {
      externalId: vol.id,
      externalSource: "googlebooks",
      title: vol.volumeInfo.title,
      authorArtist: vol.volumeInfo.authors?.[0] ?? "",
      coverUrl: thumbnail ? thumbnail.replace(/^http:\/\//, "https://") : null,
    };
  });
}

export async function searchBooks(query: string): Promise<BookItem[]> {
  const results = await searchOpenLibrary(query);

  // Open Library の結果のうちカバーなし件数が多い場合は Google Books で補完
  const withCover = results.filter((r) => r.coverUrl !== null);
  if (withCover.length >= 5) return results;

  const googleResults = await searchGoogleBooks(query);
  // Open Library 結果を優先し、Google Books を後ろに追加（重複除外は title ベース）
  const titles = new Set(results.map((r) => r.title.toLowerCase()));
  const extra = googleResults.filter(
    (r) => !titles.has(r.title.toLowerCase())
  );
  return [...results, ...extra];
}
