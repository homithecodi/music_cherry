import { proxyRemoteUrl } from "./proxy";
import type { RepeatMode, Track } from "./tracks";

const DB_NAME = "music-cherry";
const DB_VERSION = 1;
const STORE = "tracks";
const SETTINGS = "settings";

export type PersistedSettings = {
  volume: number;
  bass: number;
  treble: number;
  repeat: RepeatMode;
  shuffle: boolean;
  accentEnabled: boolean;
};

type StoredRecord = {
  id: string;
  index: number;
  track: Track;
  blob: Blob | null;
};

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(SETTINGS)) {
        db.createObjectStore(SETTINGS);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });

  return dbPromise;
}

function runRequest<T>(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return new Promise((resolve) => {
    const transaction = db.transaction(storeName, mode);
    const request = action(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    transaction.onabort = () => resolve(null);
  });
}

export async function loadLibrary(): Promise<Track[]> {
  const db = await openDatabase();
  if (!db) return [];

  const records = await runRequest<StoredRecord[]>(
    db,
    STORE,
    "readonly",
    (store) => store.getAll(),
  );
  if (!records) return [];

  const restored = records
    .filter((record) => record.track.kind !== "local" || record.blob)
    .sort((a, b) => a.index - b.index)
    .map((record) => {
      const track = { ...record.track };
      if (track.kind === "remote" && !track.corsSafe) {
        track.src = proxyRemoteUrl(track.src);
        track.corsSafe = true;
      } else if (track.kind === "local" && record.blob) {
        track.src = URL.createObjectURL(record.blob);
      }
      return track;
    });

  for (const track of restored) {
    if (track.artworkBlob) {
      track.artworkUrl = URL.createObjectURL(track.artworkBlob);
    }
  }

  return restored;
}

export async function persistTrack(track: Track, index: number, blob: Blob | null): Promise<void> {
  const db = await openDatabase();
  if (!db) return;
  await runRequest(db, STORE, "readwrite", (store) =>
    store.put({ id: track.id, index, track, blob } satisfies StoredRecord),
  );
}

export async function removePersistedTrack(id: string): Promise<void> {
  const db = await openDatabase();
  if (!db) return;
  await runRequest(db, STORE, "readwrite", (store) => store.delete(id));
}

export async function clearPersistedLibrary(): Promise<void> {
  const db = await openDatabase();
  if (!db) return;
  await runRequest(db, STORE, "readwrite", (store) => store.clear());
}

export async function persistSettings(settings: PersistedSettings): Promise<void> {
  const db = await openDatabase();
  if (!db) return;
  await runRequest(db, SETTINGS, "readwrite", (store) => store.put(settings, "player"));
}

const REPEAT_MODES: RepeatMode[] = ["off", "all", "one"];

export async function loadSettings(): Promise<Partial<PersistedSettings>> {
  const db = await openDatabase();
  if (!db) return {};
  const value = await runRequest<PersistedSettings | undefined>(
    db,
    SETTINGS,
    "readonly",
    (store) => store.get("player"),
  );
  if (!value) return {};

  return {
    ...value,
    repeat: REPEAT_MODES.includes(value.repeat) ? value.repeat : undefined,
  } as Partial<PersistedSettings>;
}
