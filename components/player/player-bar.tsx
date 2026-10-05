"use client";

import type { AudioEngine } from "@/hooks/use-audio-engine";
import { formatTime } from "@/lib/format";
import type { Track } from "@/lib/tracks";
import { Artwork } from "./artwork";
import {
  ExpandIcon,
  NextIcon,
  NoteIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  RepeatIcon,
  RepeatOneIcon,
  ShuffleIcon,
  VolumeIcon,
} from "./icons";
import { Equalizer, IconButton, Slider } from "./ui";

export function PlayerBar({
  track,
  engine,
  onExpand,
}: {
  track: Track | null;
  engine: AudioEngine;
  onExpand: () => void;
}) {
  const progress = engine.duration > 0 ? (engine.currentTime / engine.duration) * 100 : 0;
  const muted = engine.volume === 0;

  return (
    <div className="glass z-30 border-t border-line shadow-[0_-18px_40px_-30px_rgba(0,0,0,0.6)]">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onExpand}
            disabled={!track}
            aria-label="Open now playing"
            className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl transition enabled:hover:scale-[1.03] disabled:cursor-default"
          >
            <Artwork
              src={track?.artworkUrl}
              seed={`${track?.artist ?? "empty"}-${track?.album ?? "empty"}`}
              alt={track ? `${track.title} cover art` : "No track loaded"}
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition group-hover:opacity-100">
              <ExpandIcon className="h-5 w-5 text-white" />
            </span>
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">
              {track ? track.title : "Nothing playing"}
            </p>
            <p className="truncate text-xs text-muted">
              {track ? `${track.artist} · ${track.album}` : "Add a track to begin"}
            </p>
          </div>

          {track ? (
            <span className="hidden text-accent sm:block">
              <Equalizer
                readLevels={engine.readLevels}
                live={engine.isPlaying}
                available={engine.toneAvailable}
              />
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center justify-center gap-2">
            <IconButton
              onClick={engine.toggleShuffle}
              label="Shuffle"
              active={engine.shuffle}
              size="sm"
            >
              <ShuffleIcon />
            </IconButton>
            <IconButton onClick={engine.previous} label="Previous track" size="sm">
              <PrevIcon />
            </IconButton>
            <button
              type="button"
              onClick={engine.toggle}
              aria-label={engine.isPlaying ? "Pause" : "Play"}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent text-on-accent shadow-[0_12px_30px_-14px_var(--accent-glow)] transition hover:scale-105 active:scale-95 disabled:opacity-40"
              disabled={!track}
            >
              {engine.isPlaying ? (
                <PauseIcon className="h-6 w-6" />
              ) : (
                <PlayIcon className="h-6 w-6 translate-x-0.5" />
              )}
            </button>
            <IconButton onClick={engine.next} label="Next track" size="sm">
              <NextIcon />
            </IconButton>
            <IconButton
              onClick={engine.cycleRepeat}
              label={`Repeat: ${engine.repeat}`}
              active={engine.repeat !== "off"}
              size="sm"
            >
              {engine.repeat === "one" ? <RepeatOneIcon /> : <RepeatIcon />}
            </IconButton>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-10 shrink-0 text-right font-mono text-[0.7rem] text-faint">
              {formatTime(engine.currentTime)}
            </span>
            <Slider
              label="Seek"
              value={engine.currentTime}
              max={engine.duration || 1}
              onChange={engine.seek}
              disabled={!track}
            />
            <span className="w-10 shrink-0 font-mono text-[0.7rem] text-faint">
              {formatTime(engine.duration)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => engine.setVolume(muted ? 0.6 : 0)}
            aria-label={muted ? "Unmute" : "Mute"}
            className="text-muted transition hover:text-ink"
          >
            <VolumeIcon muted={muted} />
          </button>
          <div className="w-24 sm:w-32">
            <Slider
              label="Volume"
              value={muted ? 0 : engine.volume}
              onChange={engine.setVolume}
            />
          </div>
        </div>
      </div>

      <div className="h-[3px] w-full bg-line/70">
        <div
          className="h-full bg-accent transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function EmptyHint() {
  return (
    <div className="flex items-center gap-2 text-xs text-faint">
      <NoteIcon className="h-4 w-4" />
      Select a track to start
    </div>
  );
}