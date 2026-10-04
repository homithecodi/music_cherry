"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RepeatMode, Track } from "@/lib/tracks";
import { createId, trackMatches } from "@/lib/tracks";
import { readMetadata } from "@/lib/metadata";
import {
  clearPersistedLibrary,
  loadLibrary,
  loadSettings,
  persistSettings,
  persistTrack,
  removePersistedTrack,
} from "@/lib/db";

const PREF_KEY = "music-cherry:prefs";
const ACCEPTED_AUDIO = "audio/*,.mp3,.m4a,.aac,.wav,.ogg,.oga,.opus,.flac,.webm";

const DEFAULT_PREFS = {
  volume: 0.8,
  bass: 0.5,
  treble: 0.5,
  repeat: "off" as RepeatMode,
  shuffle: false,
  accentEnabled: true,
};

export type AddState = { busy: boolean; message: string | null; error: string | null };

export type Library = {
  tracks: Track[];
  ready: boolean;
  query: string;
  setQuery: (value: string) => void;
  filtered: Track[];
  prefs: typeof DEFAULT_PREFS;
  updatePrefs: (patch: Partial<typeof DEFAULT_PREFS>) => void;
  addFiles: (files: FileList | File[]) => Promise<void>;
  addUrl: (url: string) => Promise<void>;
  removeTrack: (id: string) => void;
  clearLibrary: () => void;
  addState: AddState;
};

function readStoredPrefs(): typeof DEFAULT_PREFS {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<typeof DEFAULT_PREFS>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

const METADATA_BYTES = 512 * 1024;

function urlCandidates(input: string): URL[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === "http:" || parsed.protocol === "https:" ? [parsed] : [];
    } catch {
      return [];
    }
  }

  const candidates: URL[] = [];
  for (const scheme of ["https://", "http://"]) {
    try {
      candidates.push(new URL(scheme + trimmed));
    } catch {
      /* not a valid host */
    }
  }
  return candidates;
}

function titleFromUrl(url: URL): string {
  const base = url.pathname.split("/").filter(Boolean).pop() ?? url.hostname;
  const cleaned = decodeURIComponent(base)
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
  return cleaned || url.hostname;
}

type UrlProbe = {
  corsSafe: boolean;
  blob: Blob | null;
  status: number | null;
  failure: string | null;
};

async function probeRemote(url: URL): Promise<UrlProbe> {
  try {
    const response = await fetch(url.href, {
      mode: "cors",
      headers: { Range: `bytes=0-${METADATA_BYTES - 1}` },
    });

    if (!response.ok && response.status !== 206) {
      return {
        corsSafe: false,
        blob: null,
        status: response.status,
        failure:
          response.status === 404
            ? `Nothing at that address (HTTP 404).`
            : `The server replied HTTP ${response.status}.`,
      };
    }

    const buffer = await response.arrayBuffer();
    return {
      corsSafe: true,
      blob: new Blob([buffer]),
      status: response.status,
      failure: null,
    };
  } catch {
    return {
      corsSafe: false,
      blob: null,
      status: null,
      failure: null,
    };
  }
}

export function useLibrary(): Library {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [prefs, setPrefs] = useState<typeof DEFAULT_PREFS>(DEFAULT_PREFS);
  const [addState, setAddState] = useState<AddState>({
    busy: false,
    message: null,
    error: null,
  });

  const hydratedPrefs = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const stored = readStoredPrefs();
      setPrefs(stored);
      hydratedPrefs.current = true;

      const saved = await loadSettings();
      if (!cancelled && Object.keys(saved).length > 0) {
        setPrefs((current) => ({ ...current, ...saved }));
      }

      const restored = await loadLibrary();
      if (!cancelled) {
        setTracks(restored);
        setReady(true);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydratedPrefs.current || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    } catch {
      /* storage unavailable */
    }
    void persistSettings(prefs);
  }, [prefs]);

  const updatePrefs = useCallback((patch: Partial<typeof DEFAULT_PREFS>) => {
    setPrefs((current) => ({ ...current, ...patch }));
  }, []);

  const ingest = useCallback(async (files: File[]) => {
    const audioFiles = files.filter((file) =>
      file.type.startsWith("audio/") || /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|webm)$/i.test(file.name),
    );
    if (audioFiles.length === 0) return;

    const created: Track[] = [];
    for (const file of audioFiles) {
      const metadata = await readMetadata(file, file.name);
      created.push({
        id: createId(),
        title: metadata.title ?? file.name,
        artist: metadata.artist ?? "Unknown artist",
        album: metadata.album ?? "Unknown album",
        year: metadata.year,
        duration: 0,
        size: file.size,
        kind: "local",
        src: URL.createObjectURL(file),
        corsSafe: true,
        artworkBlob: metadata.picture,
        artworkUrl: metadata.picture ? URL.createObjectURL(metadata.picture) : undefined,
      });
    }

    setTracks((current) => {
      const next = [...current, ...created];
      created.forEach((track, index) => {
        void persistTrack(track, current.length + index, audioFiles[index]);
      });
      return next;
    });
  }, []);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;

      setAddState({ busy: true, message: `Reading ${list.length} file(s)…`, error: null });
      try {
        await ingest(list);
        setAddState({ busy: false, message: `Added ${list.length} track(s)`, error: null });
      } catch {
        setAddState({ busy: false, message: null, error: "Could not read those files." });
      }
    },
    [ingest],
  );

  const addUrl = useCallback(async (raw: string) => {
    const candidates = urlCandidates(raw);
    if (candidates.length === 0) {
      setAddState({
        busy: false,
        message: null,
        error: "That does not look like a valid http(s) address.",
      });
      return;
    }

    setAddState({ busy: true, message: "Fetching…", error: null });

    let chosen: URL | null = null;
    let probe: UrlProbe | null = null;

    for (const candidate of candidates) {
      const result = await probeRemote(candidate);
      if (result.status !== null) {
        chosen = candidate;
        probe = result;
        break;
      }
    }

    const target = chosen ?? candidates[0];
    const result = probe ?? (await probeRemote(target));

    if (result.failure) {
      setAddState({ busy: false, message: null, error: result.failure });
      return;
    }

    const name = titleFromUrl(target);
    const metadata = result.blob
      ? await readMetadata(result.blob, name)
      : { title: name, artist: "Unknown artist", album: "Unknown album" };

    const track: Track = {
      id: createId(),
      title: metadata.title ?? name,
      artist: metadata.artist ?? "Unknown artist",
      album: metadata.album ?? "Unknown album",
      year: metadata.year,
      duration: 0,
      size: result.blob?.size ?? 0,
      kind: "remote",
      src: target.href,
      corsSafe: result.corsSafe,
      artworkBlob: metadata.picture,
      artworkUrl: metadata.picture ? URL.createObjectURL(metadata.picture) : undefined,
    };

    setTracks((current) => {
      void persistTrack(track, current.length, null);
      return [...current, track];
    });

    setAddState({
      busy: false,
      message: result.corsSafe
        ? `Added “${track.title}”.`
        : `Added “${track.title}”. Its server blocks cross-origin reads, so tags and bass/treble are unavailable — playback still works.`,
      error: null,
    });
  }, []);

  const removeTrack = useCallback((id: string) => {
    setTracks((current) => {
      const target = current.find((track) => track.id === id);
      if (target) {
        if (target.kind === "local") URL.revokeObjectURL(target.src);
        if (target.artworkUrl) URL.revokeObjectURL(target.artworkUrl);
      }
      void removePersistedTrack(id);
      return current.filter((track) => track.id !== id);
    });
  }, []);

  const clearLibrary = useCallback(() => {
    setTracks((current) => {
      for (const track of current) {
        if (track.kind === "local") URL.revokeObjectURL(track.src);
        if (track.artworkUrl) URL.revokeObjectURL(track.artworkUrl);
      }
      return [];
    });
    void clearPersistedLibrary();
  }, []);

  const filtered = useMemo(
    () => (query.trim() ? tracks.filter((track) => trackMatches(track, query)) : tracks),
    [query, tracks],
  );

  return {
    tracks,
    ready,
    query,
    setQuery,
    filtered,
    prefs,
    updatePrefs,
    addFiles,
    addUrl,
    removeTrack,
    clearLibrary,
    addState,
  };
}

export { ACCEPTED_AUDIO };