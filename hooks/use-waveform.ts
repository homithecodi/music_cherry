"use client";

import { useEffect, useState } from "react";
import type { Track } from "@/lib/tracks";
import {
  MAX_DECODE_BYTES,
  WAVEFORM_RESOLUTION,
  computePeaks,
  syntheticPeaks,
} from "@/lib/waveform";

export type WaveformStatus = "idle" | "loading" | "analysed" | "placeholder";

type CacheEntry = {
  peaks: Float32Array;
  status: "analysed" | "placeholder";
};

type Pending = {
  key: string;
  entry: CacheEntry;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<CacheEntry | null>>();

async function analyse(track: Track): Promise<CacheEntry | null> {
  if (!track.corsSafe) return null;

  try {
    const response = await fetch(track.src, { mode: "cors" });
    if (!response.ok) return null;

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_DECODE_BYTES) return null;

    const context = new OfflineAudioContext(1, 1, 44100);
    const audio = await context.decodeAudioData(bytes);
    if (audio.length === 0) return null;

    return { peaks: computePeaks(audio, WAVEFORM_RESOLUTION), status: "analysed" };
  } catch {
    return null;
  }
}

export function useWaveform(track: Track | null, enabled: boolean) {
  const [resolved, setResolved] = useState<Pending | null>(null);
  const active = Boolean(track) && enabled;
  const key = track ? track.id : null;
  const cached = key ? cache.get(key) : undefined;
  const fresh = key && resolved?.key === key ? resolved.entry : null;
  const entry = cached ?? fresh ?? null;

  useEffect(() => {
    if (!track || !enabled) return;
    if (cache.has(track.id)) return;

    const job =
      inflight.get(track.id) ??
      analyse(track).finally(() => {
        inflight.delete(track.id);
      });
    inflight.set(track.id, job);

    void job.then((result) => {
      const next: CacheEntry = result ?? {
        peaks: syntheticPeaks(WAVEFORM_RESOLUTION, track.id),
        status: "placeholder",
      };
      cache.set(track.id, next);
      setResolved({ key: track.id, entry: next });
    });
  }, [enabled, track]);

  if (!active) return { peaks: null, status: "idle" as const };
  if (entry) return { peaks: entry.peaks, status: entry.status };
  return { peaks: null, status: "loading" as const };
}

export function clearWaveformCache(): void {
  cache.clear();
}