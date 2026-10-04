export type RepeatMode = "off" | "all" | "one";

export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  year?: string;
  duration: number;
  size: number;
  kind: "local" | "remote";
  src: string;
  corsSafe: boolean;
  artworkUrl?: string;
  artworkBlob?: Blob;
};

export type TrackInput = {
  title: string;
  artist: string;
  album: string;
  year?: string;
  size: number;
  kind: Track["kind"];
  src: string;
  corsSafe?: boolean;
  artworkBlob?: Blob;
  fileBlob?: Blob;
};

export function needsAudioGraph(track: Pick<Track, "kind" | "corsSafe"> | null): boolean {
  if (!track) return true;
  return track.kind === "local" || track.corsSafe;
}

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function trackMatches(track: Track, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    track.title.toLowerCase().includes(needle) ||
    track.artist.toLowerCase().includes(needle) ||
    track.album.toLowerCase().includes(needle) ||
    (track.year ?? "").includes(needle)
  );
}