"use client";

import { useRef, useState } from "react";
import type { Library } from "@/hooks/use-library";
import { ACCEPTED_AUDIO } from "@/hooks/use-library";
import type { AudioEngine } from "@/hooks/use-audio-engine";
import { formatBytes, formatCount, formatTime } from "@/lib/format";
import type { Track } from "@/lib/tracks";
import { Artwork } from "./artwork";
import {
  LinkIcon,
  NoteIcon,
  PaletteIcon,
  QueueIcon,
  SearchIcon,
  SlidersIcon,
  TrashIcon,
  UploadIcon,
} from "./icons";
import { Equalizer, IconButton, Slider } from "./ui";

export function LibraryPanel({
  library,
  engine,
  currentId,
  accentEnabled,
  onToggleAccent,
  onAddLocal,
  onAddUrl,
}: {
  library: Library;
  engine: AudioEngine;
  currentId: string | null;
  accentEnabled: boolean;
  onToggleAccent: () => void;
  onAddLocal: (files: FileList | File[]) => void;
  onAddUrl: (url: string) => void;
}) {
  const { filtered, query, setQuery, tracks, removeTrack, clearLibrary, addState } = library;
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [showTone, setShowTone] = useState(false);

  const totalSize = tracks.reduce((sum, track) => sum + track.size, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink">Library</h2>
          <p className="text-sm text-muted">
            {library.ready
              ? `${formatCount(tracks.length, "track")}${totalSize > 0 ? ` · ${formatBytes(totalSize)}` : ""}`
              : "Loading…"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <IconButton
            onClick={onToggleAccent}
            label={accentEnabled ? "Disable artwork colours" : "Enable artwork colours"}
            active={accentEnabled}
            size="sm"
          >
            <PaletteIcon />
          </IconButton>
          <IconButton
            onClick={() => setShowTone((value) => !value)}
            label="Tone controls"
            active={showTone}
            size="sm"
          >
            <SlidersIcon />
          </IconButton>
          <IconButton onClick={() => inputRef.current?.click()} label="Add local files" size="sm">
            <UploadIcon />
          </IconButton>
          {tracks.length > 0 ? (
            <IconButton onClick={clearLibrary} label="Clear library" size="sm">
              <TrashIcon />
            </IconButton>
          ) : null}
        </div>
      </div>

      {showTone ? (
        <div className="animate-rise grid gap-5 rounded-3xl border border-line bg-surface p-5 sm:grid-cols-2">
          <ToneControl
            label="Bass"
            hint="Low shelf · 250 Hz"
            value={engine.bass}
            onChange={engine.setBass}
            disabled={!engine.toneAvailable}
          />
          <ToneControl
            label="Treble"
            hint="High shelf · 4 kHz"
            value={engine.treble}
            onChange={engine.setTreble}
            disabled={!engine.toneAvailable}
          />
          {!engine.toneAvailable ? (
            <p className="text-xs text-faint sm:col-span-2">
              This track&rsquo;s server blocks cross-origin reads, so tone shaping is unavailable.
              Volume still works.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, artist, album…"
            aria-label="Search library"
            className="w-full rounded-2xl border border-line bg-surface py-3 pl-11 pr-4 text-sm text-ink outline-none transition placeholder:text-faint focus:border-accent"
          />
        </div>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!url.trim()) return;
            onAddUrl(url);
            setUrl("");
          }}
        >
          <div className="relative flex-1 sm:w-72">
            <LinkIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="Paste audio URL…"
              aria-label="Audio URL"
              className="w-full rounded-2xl border border-line bg-surface py-3 pl-11 pr-4 text-sm text-ink outline-none transition placeholder:text-faint focus:border-accent"
            />
          </div>
          <button
            type="submit"
            className="shrink-0 rounded-2xl bg-accent px-5 text-sm font-semibold text-on-accent transition hover:brightness-110 disabled:opacity-50"
            disabled={addState.busy || !url.trim()}
          >
            {addState.busy ? "…" : "Add"}
          </button>
        </form>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_AUDIO}
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) onAddLocal(event.target.files);
          event.target.value = "";
        }}
      />

      {addState.message || addState.error ? (
        <p
          className={`animate-fade text-sm ${addState.error ? "text-red-500" : "text-muted"}`}
          role="status"
        >
          {addState.error ?? addState.message}
        </p>
      ) : null}

      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto rounded-3xl border border-line bg-surface p-2">
        {filtered.length === 0 ? (
          <EmptyLibrary hasQuery={Boolean(query.trim())} />
        ) : (
          <ul className="flex flex-col gap-0.5">
            {filtered.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                active={track.id === currentId}
                playing={track.id === currentId && engine.isPlaying}
                position={filtered.indexOf(track) + 1}
                onPlay={() => engine.playTrack(track.id)}
                onRemove={() => removeTrack(track.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ToneControl({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const offset = Math.round((value - 0.5) * 24);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium text-ink">{label}</label>
        <span className="font-mono text-xs text-muted">
          {offset > 0 ? "+" : ""}
          {offset} dB
        </span>
      </div>
      <Slider label={label} value={value} onChange={onChange} disabled={disabled} />
      <p className="text-xs text-faint">{hint}</p>
    </div>
  );
}

function TrackRow({
  track,
  active,
  playing,
  position,
  onPlay,
  onRemove,
}: {
  track: Track;
  active: boolean;
  playing: boolean;
  position: number;
  onPlay: () => void;
  onRemove: () => void;
}) {
  return (
    <li>
      <div
        className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition ${
          active ? "bg-surface-raised ring-1 ring-accent/40" : "hover:bg-surface-raised"
        }`}
      >
        <button
          type="button"
          onClick={onPlay}
          className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl text-left"
          aria-label={`Play ${track.title}`}
        >
          <Artwork src={track.artworkUrl} seed={track.title} alt={`${track.title} cover art`} />
          <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100">
            <QueueIcon className="h-4 w-4 text-white" />
          </span>
        </button>

        <button
          type="button"
          onClick={onPlay}
          className="flex min-w-0 flex-1 flex-col items-start text-left"
        >
          <span className="flex w-full items-center gap-2">
            <span
              className={`truncate text-sm font-medium ${active ? "text-accent" : "text-ink"}`}
            >
              {track.title}
            </span>
            {playing ? (
              <span className="text-accent">
                <Equalizer live bars={3} />
              </span>
            ) : null}
          </span>
          <span className="truncate text-xs text-muted">
            {track.artist}
            {track.year ? ` · ${track.year}` : ""}
          </span>
        </button>

        <span className="hidden w-40 truncate text-xs text-muted lg:block">{track.album}</span>
        <span className="w-12 shrink-0 text-right font-mono text-xs text-faint">
          {position}
        </span>
        <span className="hidden w-14 shrink-0 text-right font-mono text-xs text-faint sm:block">
          {track.duration > 0 ? formatTime(track.duration) : "--:--"}
        </span>

        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${track.title}`}
          className="shrink-0 rounded-lg p-1.5 text-faint opacity-0 transition hover:text-red-500 group-hover:opacity-100 focus-visible:opacity-100"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function EmptyLibrary({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface-raised">
        <NoteIcon className="h-6 w-6 text-faint" />
      </div>
      <p className="text-sm font-medium text-ink">
        {hasQuery ? "No matching tracks" : "Your library is empty"}
      </p>
      <p className="max-w-xs text-xs text-muted">
        {hasQuery
          ? "Try a different title, artist or album."
          : "Add audio files from your device or paste a direct link to a song."}
      </p>
    </div>
  );
}