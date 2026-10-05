"use client";

import type { AudioEngine } from "@/hooks/use-audio-engine";
import { formatBytes, formatTime } from "@/lib/format";
import type { Track } from "@/lib/tracks";
import type { Palette } from "@/lib/color";
import { useWaveform } from "@/hooks/use-waveform";
import { Artwork } from "./artwork";
import {
  ChevronDownIcon,
  LinkIcon,
  NextIcon,
  NoteIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  RepeatIcon,
  RepeatOneIcon,
  ShuffleIcon,
  UploadIcon,
} from "./icons";
import { Equalizer, IconButton } from "./ui";
import { WaveformSeek } from "./waveform-seek";

export function NowPlaying({
  track,
  engine,
  open,
  palette,
  onClose,
}: {
  track: Track | null;
  engine: AudioEngine;
  open: boolean;
  palette: Palette;
  onClose: () => void;
}) {
  const waveform = useWaveform(track, open);

  if (!open) return null;

  const progress =
    engine.duration > 0 ? (engine.currentTime / engine.duration) * 100 : 0;

  return (
    <div className="animate-fade fixed inset-0 z-50 flex flex-col overflow-hidden">
      <div
        className="animate-backdrop absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(160deg, var(--art-a), var(--art-b) 48%, var(--art-c))`,
        }}
      />
      <div className="absolute inset-0 bg-black/35 backdrop-blur-2xl" />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <IconButton
            onClick={onClose}
            label="Close now playing"
            className="text-white"
          >
            <ChevronDownIcon />
          </IconButton>
          <div className="min-w-0 text-center">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.28em] text-white/55">
              Now playing
            </p>
          </div>
          <div className="w-11" />
        </header>

        {track ? (
          <div className="scroll-slim flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-5 pb-10 sm:px-8">
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-9 lg:flex-row lg:items-center lg:gap-14">
              <div className="relative w-full max-w-[min(74vw,26rem)] shrink-0">
                <div
                  className="absolute -inset-8 -z-10 rounded-full opacity-70 blur-3xl"
                  style={{ background: "var(--accent-glow)" }}
                />
                <div className="artwork-shadow animate-backdrop aspect-square w-full overflow-hidden rounded-[2rem]">
                  <Artwork
                    src={track.artworkUrl}
                    seed={`${track.artist}-${track.album}`}
                    alt={`${track.title} cover art`}
                    rounded="rounded-[2rem]"
                  />
                </div>
              </div>

              <div className="flex w-full max-w-xl flex-col gap-6 text-center lg:text-left">
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                    {track.album}
                  </p>
                  <h1 className="animate-rise text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                    {track.title}
                  </h1>
                  <p
                    className="animate-rise text-lg text-white/70"
                    style={{ animationDelay: "70ms" }}
                  >
                    {track.artist}
                  </p>
                </div>

                <div className="flex flex-col gap-2.5">
                  <WaveformSeek
                    peaks={waveform.peaks}
                    status={waveform.status}
                    currentTime={engine.currentTime}
                    duration={engine.duration}
                    accent={palette.accent}
                    restColor="rgba(255,255,255,0.28)"
                    onSeek={engine.seek}
                  />
                </div>

                <div className="flex items-center justify-center gap-5 lg:justify-start">
                  <IconButton
                    onClick={engine.toggleShuffle}
                    label="Shuffle"
                    active={engine.shuffle}
                    className="text-white"
                  >
                    <ShuffleIcon />
                  </IconButton>
                  <IconButton
                    onClick={engine.previous}
                    label="Previous track"
                    className="text-white"
                  >
                    <PrevIcon />
                  </IconButton>
                  <button
                    type="button"
                    onClick={engine.toggle}
                    aria-label={engine.isPlaying ? "Pause" : "Play"}
                    className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-white text-[#14151c] shadow-[0_20px_50px_-18px_rgba(0,0,0,0.8)] transition hover:scale-105 active:scale-95"
                  >
                    {engine.isPlaying ? (
                      <PauseIcon className="h-8 w-8" />
                    ) : (
                      <PlayIcon className="h-8 w-8 translate-x-0.5" />
                    )}
                  </button>
                  <IconButton
                    onClick={engine.next}
                    label="Next track"
                    className="text-white"
                  >
                    <NextIcon />
                  </IconButton>
                  <IconButton
                    onClick={engine.cycleRepeat}
                    label={`Repeat: ${engine.repeat}`}
                    active={engine.repeat !== "off"}
                    className="text-white"
                  >
                    {engine.repeat === "one" ? (
                      <RepeatOneIcon />
                    ) : (
                      <RepeatIcon />
                    )}
                  </IconButton>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-2xl border border-white/12 bg-white/8 p-4 text-left text-sm backdrop-blur-md sm:grid-cols-4">
                  <Meta label="Artist" value={track.artist} />
                  <Meta label="Album" value={track.album} />
                  <Meta label="Year" value={track.year ?? "—"} />
                  <Meta label="Size" value={formatBytes(track.size) || "—"} />
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-white/60 lg:justify-start">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1">
                    {track.kind === "local" ? (
                      <UploadIcon className="h-3.5 w-3.5" />
                    ) : (
                      <LinkIcon className="h-3.5 w-3.5" />
                    )}
                    {track.kind === "local" ? "Local file" : "Remote stream"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1">
                    <NoteIcon className="h-3.5 w-3.5" />
                    {engine.duration > 0 ? formatTime(engine.duration) : "Live"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-white/85">
                    <Equalizer
                      readLevels={engine.readLevels}
                      available={engine.toneAvailable}
                      bars={40}
                      mirrored={false}
                      live={engine.isPlaying}
                    />
                    {engine.isPlaying && "Playing"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="animate-fade flex h-28 w-28 items-center justify-center rounded-3xl border border-white/15 bg-white/10">
              <NoteIcon className="h-12 w-12 text-white/70" />
            </div>
            <h2 className="text-2xl font-semibold text-white">
              Nothing playing yet
            </h2>
            <p className="max-w-sm text-sm text-white/65">
              Pick a track from your library to start listening.
            </p>
          </div>
        )}

        <div className="h-1 w-full bg-white/10">
          <div
            className="h-full bg-white/85 transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/45">
        {label}
      </p>
      <p className="truncate text-white/90">{value}</p>
    </div>
  );
}
