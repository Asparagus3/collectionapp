export type MusicItem = {
  externalId: string;
  externalSource: "lastfm";
  title: string;
  authorArtist: string;
  coverUrl: string | null;
};

const LASTFM_BASE = "https://ws.audioscrobbler.com/2.0/";

function apiKey(): string {
  return process.env.NEXT_PUBLIC_LASTFM_API_KEY ?? "";
}

type LastfmImage = { "#text": string; size: string };

type LastfmAlbum = {
  name: string;
  artist: string;
  url: string;
  image: LastfmImage[];
};

type LastfmArtist = {
  name: string;
  url: string;
  image: LastfmImage[];
};

function bestImage(images: LastfmImage[]): string | null {
  const preferred = ["extralarge", "large", "medium"];
  for (const size of preferred) {
    const found = images.find((img) => img.size === size);
    if (found?.["#text"]) return found["#text"];
  }
  return null;
}

export async function searchAlbums(query: string): Promise<MusicItem[]> {
  const url = new URL(LASTFM_BASE);
  url.searchParams.set("method", "album.search");
  url.searchParams.set("album", query);
  url.searchParams.set("api_key", apiKey());
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "20");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Last.fm album.search error: ${res.status}`);
  const data: { results?: { albummatches?: { album?: LastfmAlbum[] } } } =
    await res.json();

  return (data.results?.albummatches?.album ?? []).map((album) => ({
    externalId: album.url,
    externalSource: "lastfm",
    title: album.name,
    authorArtist: album.artist,
    coverUrl: bestImage(album.image),
  }));
}

export async function searchArtists(query: string): Promise<MusicItem[]> {
  const url = new URL(LASTFM_BASE);
  url.searchParams.set("method", "artist.search");
  url.searchParams.set("artist", query);
  url.searchParams.set("api_key", apiKey());
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "20");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Last.fm artist.search error: ${res.status}`);
  const data: { results?: { artistmatches?: { artist?: LastfmArtist[] } } } =
    await res.json();

  return (data.results?.artistmatches?.artist ?? []).map((artist) => ({
    externalId: artist.url,
    externalSource: "lastfm",
    title: artist.name,
    authorArtist: artist.name,
    coverUrl: bestImage(artist.image),
  }));
}
