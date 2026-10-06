"use client";

import { useEffect, useRef, useState } from "react";
import type { AudioEngine } from "@/hooks/use-audio-engine";
import type { Track } from "@/lib/tracks";
import { proxyRemoteUrl } from "@/lib/proxy";
import { SILENCE_RMS } from "@/lib/spectrum";
import { MAX_DECODE_BYTES, WAVEFORM_RESOLUTION, computePeaks, computeRawPeaks, shape, syntheticPeaks } from "@/lib/waveform";

export type WaveformStatus = "idle" | "loading" | "analysed" | "real-time" | "placeholder";

type CacheEntry = {
  peaks: Float32Array;
  status: "analysed" | "placeholder";
};

type Pending = {
  key: string;
  entry: CacheEntry;
};

const RANGE_SAMPLE_COUNT = 32;
const RANGE_BYTES_PER_SAMPLE = 128 * 1024;

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<CacheEntry | null>>();

async function analyse(track: Track): Promise<CacheEntry | null> {
  const src = !track.corsSafe ? proxyRemoteUrl(track.src) : track.src;

  try {
    if (track.size > 0) {
      const ranged = await analyseWithRanges(src, track.size);
      if (ranged) return ranged;
    }
    return await analyseFullFile(src);
  } catch {
    return null;
  }
}

async function analyseFullFile(src: string): Promise<CacheEntry | null> {
  const response = await fetch(src, { mode: "cors" });
  if (!response.ok) return null;

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_DECODE_BYTES) return null;

  const context = new OfflineAudioContext(1, 1, 44100);
  const audio = await context.decodeAudioData(bytes);
  if (audio.length === 0) return null;

  return { peaks: computePeaks(audio, WAVEFORM_RESOLUTION), status: "analysed" };
}

function barRangeForSample(index: number): { barStart: number; barEnd: number } {
  const barStart = Math.floor((index * WAVEFORM_RESOLUTION) / RANGE_SAMPLE_COUNT);
  const barEnd = Math.min(
    WAVEFORM_RESOLUTION,
    Math.ceil(((index + 1) * WAVEFORM_RESOLUTION) / RANGE_SAMPLE_COUNT),
  );
  return { barStart, barEnd };
}

async function fetchRangePeaks(
  src: string,
  context: OfflineAudioContext,
  start: number,
  end: number,
  index: number,
): Promise<{ peaks: Float32Array; barStart: number; barEnd: number } | null> {
  const { barStart, barEnd } = barRangeForSample(index);
  const barCount = barEnd - barStart;

  let response: Response;
  try {
    response = await fetch(src, {
      mode: "cors",
      headers: { Range: `bytes=${start}-${end}` },
    });
  } catch {
    return null;
  }

  if (!response.ok || response.status !== 206) {
    void response.body?.cancel();
    return null;
  }

  let bytes: ArrayBuffer;
  try {
    bytes = await response.arrayBuffer();
  } catch {
    return null;
  }

  if (bytes.byteLength === 0 || bytes.byteLength > MAX_DECODE_BYTES) return null;

  let audio: AudioBuffer;
  try {
    audio = await context.decodeAudioData(bytes);
  } catch {
    return null;
  }

  if (audio.length === 0) return null;
  return { peaks: computeRawPeaks(audio, barCount), barStart, barEnd };
}

async function analyseWithRanges(src: string, totalSize: number): Promise<CacheEntry | null> {
  const sampleSize = Math.min(RANGE_BYTES_PER_SAMPLE, totalSize);
  const peaks = new Float32Array(WAVEFORM_RESOLUTION);
  const context = new OfflineAudioContext(1, 1, 44100);

  const fetches: ReturnType<typeof fetchRangePeaks>[] = [];
  for (let i = 0; i < RANGE_SAMPLE_COUNT; i += 1) {
    const start = Math.floor((totalSize * i) / RANGE_SAMPLE_COUNT);
    const end = Math.min(start + sampleSize - 1, totalSize - 1);
    fetches.push(fetchRangePeaks(src, context, start, end, i));
  }

  const results = await Promise.all(fetches);

  let hasData = false;
  for (const result of results) {
    if (!result) continue;
    for (let i = 0; i < result.peaks.length; i += 1) {
      peaks[result.barStart + i] = result.peaks[i];
      if (result.peaks[i] > 0) hasData = true;
    }
  }

  if (!hasData) return null;
  return { peaks: shape(peaks), status: "analysed" };
}

const SAMPLE_THROTTLE_MS = 66;
const FINALISE_THRESHOLD = 0.3;

export function useWaveform(track: Track | null, enabled: boolean, engine?: AudioEngine) {
  const [resolved, setResolved] = useState<Pending | null>(null);
  const [realtime, setRealtime] = useState<{ peaks: Float32Array } | null>(null);
  const active = Boolean(track) && enabled;
  const key = track ? track.id : null;
  const cached = key ? cache.get(key) : undefined;
  const fresh = key && resolved?.key === key ? resolved.entry : null;
  const entry = cached ?? fresh ?? null;

  const engineRef = useRef<AudioEngine | null>(null);
  useEffect(() => {
    engineRef.current = engine ?? null;
  }, [engine]);

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

  useEffect(() => {
    if (!track || !enabled) return;

    const cachedEntry = cache.get(track.id);
    if (cachedEntry?.status === "analysed") return;
    if (resolved?.key === track.id && resolved.entry.status === "analysed") return;

    const base = cachedEntry?.peaks ?? syntheticPeaks(WAVEFORM_RESOLUTION, track.id);
    const peaks = base.slice();

    let frame: number | null = null;
    let lastUpdate = 0;
    let initialised = false;

    const tick = (timestamp: number) => {
      if (!initialised) {
        initialised = true;
        setRealtime({ peaks: peaks.slice() });
      }

      const engine = engineRef.current;
      if (engine && engine.isPlaying && engine.duration > 0 && engine.currentTime > 0) {
        const amplitude = engine.readAmplitude();
        if (amplitude > SILENCE_RMS) {
          const progress = engine.currentTime / engine.duration;
          const barIndex = Math.max(
            0,
            Math.min(WAVEFORM_RESOLUTION - 1, Math.floor(progress * WAVEFORM_RESOLUTION)),
          );
          peaks[barIndex] = amplitude;
        }
      }

      if (timestamp - lastUpdate > SAMPLE_THROTTLE_MS) {
        lastUpdate = timestamp;
        setRealtime({ peaks: peaks.slice() });
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);

      const existing = cache.get(track.id);
      if (!existing || existing.status === "placeholder") {
        const realBars = peaks.filter((p) => p > 0.035).length;
        if (realBars > WAVEFORM_RESOLUTION * FINALISE_THRESHOLD) {
          cache.set(track.id, { peaks, status: "analysed" });
        }
      }
    };
  }, [enabled, resolved, track]);

  if (!active) return { peaks: null, status: "idle" as const };
  if (entry && entry.status === "analysed") return { peaks: entry.peaks, status: entry.status };
  if (realtime) return { peaks: realtime.peaks, status: "real-time" as const };
  if (entry) return { peaks: entry.peaks, status: entry.status };
  return { peaks: null, status: "loading" as const };
}

export function clearWaveformCache(): void {
  cache.clear();
}
