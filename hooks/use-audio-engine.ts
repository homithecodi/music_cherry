"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RepeatMode, Track } from "@/lib/tracks";
import { needsAudioGraph } from "@/lib/tracks";

const TONE_RANGE_DB = 12;

export type AudioSettings = {
  volume: number;
  bass: number;
  treble: number;
  repeat: RepeatMode;
  shuffle: boolean;
};

type Graph = {
  context: AudioContext;
  low: BiquadFilterNode;
  high: BiquadFilterNode;
  gain: GainNode;
};

export type AudioEngine = {
  current: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  toneAvailable: boolean;
  volume: number;
  bass: number;
  treble: number;
  shuffle: boolean;
  repeat: RepeatMode;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  playTrack: (id: string) => void;
  setVolume: (value: number) => void;
  setBass: (value: number) => void;
  setTreble: (value: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
};

function shuffled(ids: string[], first: string): string[] {
  const rest = ids.filter((id) => id !== first);
  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [first, ...rest];
}

function toDb(normalized: number): number {
  return (Math.min(Math.max(normalized, 0), 1) - 0.5) * 2 * TONE_RANGE_DB;
}

function rewindElement(audio: HTMLAudioElement) {
  audio.currentTime = 0;
}

export function useAudioEngine(
  queue: Track[],
  settings: AudioSettings,
  onSettingsChange: (patch: Partial<AudioSettings>) => void,
): AudioEngine {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const orderRef = useRef<string[]>([]);
  const indexRef = useRef(-1);
  const frameRef = useRef<number | null>(null);
  const currentRef = useRef<Track | null>(null);
  const settingsRef = useRef(settings);
  const endedRef = useRef<() => void>(() => undefined);
  const isPlayingRef = useRef(false);
  const modeRef = useRef<boolean | null>(null);

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);

  const activeId = useMemo(() => {
    if (queue.length === 0) return null;
    if (currentId && queue.some((track) => track.id === currentId)) return currentId;
    return queue[0].id;
  }, [currentId, queue]);

  const current = useMemo(
    () => queue.find((track) => track.id === activeId) ?? null,
    [activeId, queue],
  );

  const toneAvailable = needsAudioGraph(current);

  useEffect(() => {
    currentRef.current = current;
    settingsRef.current = settings;
    isPlayingRef.current = isPlaying;
  }, [current, isPlaying, settings]);

  const applyTone = useCallback(() => {
    const value = settingsRef.current;
    const graph = graphRef.current;

    if (!graph) {
      const audio = audioRef.current;
      if (audio) audio.volume = value.volume;
      return;
    }

    const now = graph.context.currentTime;
    graph.gain.gain.setTargetAtTime(value.volume * value.volume, now, 0.02);
    graph.low.gain.setTargetAtTime(toDb(value.bass), now, 0.05);
    graph.high.gain.setTargetAtTime(toDb(value.treble), now, 0.05);
  }, []);

  const startPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (graphRef.current?.context.state === "suspended") {
      void graphRef.current.context.resume();
    }
    applyTone();

    void audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  }, [applyTone]);

  const teardownAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    const graph = graphRef.current;
    if (graph) void graph.context.close().catch(() => undefined);
    graphRef.current = null;
    audioRef.current = null;
    modeRef.current = null;
  }, []);

  const createAudio = useCallback(
    (withGraph: boolean) => {
      if (typeof window === "undefined") return null;
      teardownAudio();

      const audio = new Audio();
      audio.preload = "metadata";
      if (withGraph) audio.crossOrigin = "anonymous";
      audioRef.current = audio;
      modeRef.current = withGraph;

      const handleMetadata = () => {
        const track = currentRef.current;
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          if (track) track.duration = audio.duration;
          setDuration(audio.duration);
        }
      };

      audio.addEventListener("loadedmetadata", handleMetadata);
      audio.addEventListener("durationchange", handleMetadata);
      audio.addEventListener("ended", () => endedRef.current());
      audio.addEventListener("play", () => setIsPlaying(true));
      audio.addEventListener("pause", () => setIsPlaying(false));
      audio.addEventListener("progress", () => {
        if (audio.buffered.length > 0) {
          setBuffered(audio.buffered.end(audio.buffered.length - 1));
        }
      });
      audio.addEventListener("error", () => setIsPlaying(false));

      return audio;
    },
    [teardownAudio],
  );

  const ensureGraph = useCallback((audio: HTMLAudioElement) => {
    if (graphRef.current) return graphRef.current;
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    const context = new AudioContextClass();
    const source = context.createMediaElementSource(audio);
    const low = context.createBiquadFilter();
    low.type = "lowshelf";
    low.frequency.value = 250;
    const high = context.createBiquadFilter();
    high.type = "highshelf";
    high.frequency.value = 4000;
    const gain = context.createGain();

    source.connect(low).connect(high).connect(gain).connect(context.destination);

    graphRef.current = { context, low, high, gain };
    return graphRef.current;
  }, []);

  const loadInto = useCallback(
    (track: Track, autoplay: boolean) => {
      const withGraph = needsAudioGraph(track);
      const existing = audioRef.current;
      const audio =
        existing && modeRef.current === withGraph ? existing : createAudio(withGraph);
      if (!audio) return;

      if (withGraph) ensureGraph(audio);

      if (audio.getAttribute("src") !== track.src) {
        audio.setAttribute("src", track.src);
        audio.load();
      }

rewindElement(audio);
      setCurrentTime(0);
      setBuffered(0);
      setDuration(track.duration || 0);
      applyTone();

      if (autoplay) startPlayback();
    },
    [applyTone, createAudio, ensureGraph, startPlayback],
  );

  const goToIndex = useCallback(
    (index: number, autoplay: boolean) => {
      const length = orderRef.current.length;
      if (length === 0) return;
      const bounded = ((index % length) + length) % length;
      indexRef.current = bounded;

      const track = queue.find((item) => item.id === orderRef.current[bounded]);
      if (!track) return;

      setCurrentId(track.id);
      loadInto(track, autoplay);
    },
    [loadInto, queue],
  );

  const advance = useCallback(
    (autoplay: boolean) => {
      const length = orderRef.current.length;
      if (length === 0) return;
      const atEnd = indexRef.current >= length - 1;

      if (atEnd && settingsRef.current.repeat === "off") {
        const audio = audioRef.current;
        if (audio) audio.currentTime = 0;
        setIsPlaying(false);
        setCurrentTime(0);
        return;
      }

      goToIndex(indexRef.current + 1, autoplay);
    },
    [goToIndex],
  );

  useEffect(() => {
    endedRef.current = () => {
      if (settingsRef.current.repeat === "one") {
        const audio = audioRef.current;
        if (audio) audio.currentTime = 0;
        setCurrentTime(0);
        startPlayback();
        return;
      }
      advance(true);
    };
  }, [advance, startPlayback]);

  const rewind = useCallback(() => {
    const length = orderRef.current.length;
    if (length === 0) return;
    const atEnd = indexRef.current >= length - 1;

    if (atEnd && settingsRef.current.repeat === "off" && !isPlayingRef.current) {
      const audio = audioRef.current;
      if (audio) audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    goToIndex(indexRef.current - 1, isPlayingRef.current);
  }, [goToIndex]);

  const playTrack = useCallback(
    (id: string) => {
      if (!orderRef.current.includes(id)) {
        orderRef.current = [id, ...orderRef.current];
        goToIndex(0, true);
        return;
      }

      const target = orderRef.current.indexOf(id);
      const audio = audioRef.current;

      if (target === indexRef.current && audio) {
        if (audio.paused) startPlayback();
        else {
          audio.currentTime = 0;
          setCurrentTime(0);
          startPlayback();
        }
        return;
      }

      goToIndex(target, true);
    },
    [goToIndex, startPlayback],
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!currentRef.current) {
      if (orderRef.current.length > 0) goToIndex(0, true);
      return;
    }

    if (audio.paused) startPlayback();
    else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [goToIndex, startPlayback]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const limit = Number.isFinite(audio.duration) ? audio.duration : time;
    const target = Math.min(Math.max(time, 0), limit);
    audio.currentTime = target;
    setCurrentTime(target);
  }, []);

  const queueIds = useMemo(() => queue.map((track) => track.id), [queue]);

  useEffect(() => {
    createAudio(true);
    return teardownAudio;
  }, [createAudio, teardownAudio]);

  useEffect(() => {
    if (!audioRef.current) createAudio(true);
  }, [createAudio, queueIds.length]);

  useEffect(() => {
    const previousIds = orderRef.current;
    const activeId = previousIds[indexRef.current];

    if (queueIds.length === 0) {
      orderRef.current = [];
      indexRef.current = -1;
      return;
    }

    const stillPresent = activeId ? queueIds.includes(activeId) : false;

    if (!stillPresent) {
      const order = settings.shuffle ? shuffled(queueIds, queueIds[0]) : queueIds;
      orderRef.current = order;
      indexRef.current = 0;
      const track = queue.find((item) => item.id === order[0]);
      if (track) loadInto(track, false);
      return;
    }

    const unchanged =
      previousIds.length === queueIds.length && previousIds.every((id) => queueIds.includes(id));

    orderRef.current = settings.shuffle
      ? unchanged
        ? previousIds
        : shuffled(queueIds, activeId)
      : queueIds;
    indexRef.current = orderRef.current.indexOf(activeId);
  }, [loadInto, queue, queueIds, settings.shuffle]);

  useEffect(() => {
    applyTone();
  }, [applyTone, settings.bass, settings.treble, settings.volume]);

  useEffect(() => {
    const tick = () => {
      const audio = audioRef.current;
      if (audio && !audio.paused) setCurrentTime(audio.currentTime);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      const graph = graphRef.current;
      if (graph) void graph.context.close().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;
    const track = currentRef.current;

    if (track) {
      const artwork = track.artworkUrl
        ? [{ src: track.artworkUrl, sizes: "512x512", type: "image/jpeg" }]
        : [];
      try {
        session.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist,
          album: track.album,
          artwork,
        });
      } catch {
        /* media metadata unsupported */
      }
    }
    session.playbackState = isPlaying ? "playing" : "paused";

    const handlers: [MediaSessionAction, MediaSessionActionHandler | null][] = [
      ["play", () => toggle()],
      ["pause", () => audioRef.current?.pause()],
      ["nexttrack", () => advance(true)],
      ["previoustrack", () => rewind()],
      ["seekbackward", () => seek((audioRef.current?.currentTime ?? 0) - 10)],
      ["seekforward", () => seek((audioRef.current?.currentTime ?? 0) + 10)],
      [
        "seekto",
        (details) => {
          if (typeof details.seekTime === "number") seek(details.seekTime);
        },
      ],
    ];

    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        /* action unsupported */
      }
    }

    return () => {
      for (const [action] of handlers) {
        try {
          session.setActionHandler(action, null);
        } catch {
          /* action unsupported */
        }
      }
    };
  }, [advance, current, isPlaying, rewind, seek, toggle]);

  const setVolume = useCallback(
    (value: number) => onSettingsChange({ volume: Math.min(Math.max(value, 0), 1) }),
    [onSettingsChange],
  );

  const setBass = useCallback(
    (value: number) => onSettingsChange({ bass: Math.min(Math.max(value, 0), 1) }),
    [onSettingsChange],
  );
  const setTreble = useCallback(
    (value: number) => onSettingsChange({ treble: Math.min(Math.max(value, 0), 1) }),
    [onSettingsChange],
  );

  const toggleShuffle = useCallback(
    () => onSettingsChange({ shuffle: !settingsRef.current.shuffle }),
    [onSettingsChange],
  );

  const cycleRepeat = useCallback(() => {
    const order: RepeatMode[] = ["off", "all", "one"];
    const index = order.indexOf(settingsRef.current.repeat);
    onSettingsChange({ repeat: order[(index + 1) % order.length] });
  }, [onSettingsChange]);

  return {
    current,
    isPlaying,
    currentTime,
    duration: duration || current?.duration || 0,
    buffered,
    toneAvailable,
    volume: settings.volume,
    bass: settings.bass,
    treble: settings.treble,
    shuffle: settings.shuffle,
    repeat: settings.repeat,
    toggle,
    next: () => advance(true),
    previous: rewind,
    seek,
    playTrack,
    setVolume,
    setBass,
    setTreble,
    toggleShuffle,
    cycleRepeat,
  };
}