"use client";

import { useMemo, useState } from "react";
import { useArtworkColors } from "@/hooks/use-artwork-colors";
import type { AudioSettings } from "@/hooks/use-audio-engine";
import { useAudioEngine } from "@/hooks/use-audio-engine";
import { useLibrary } from "@/hooks/use-library";
import { useTheme } from "@/hooks/use-theme";
import { LibraryPanel } from "./library-panel";
import { NoteIcon } from "./icons";
import { NowPlaying } from "./now-playing";
import { PlayerBar } from "./player-bar";
import { ThemeToggle } from "./theme-toggle";

export function MusicPlayer() {
  const library = useLibrary();
  const { theme, toggle: toggleTheme } = useTheme();
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);

  const settings = useMemo<AudioSettings>(
    () => ({
      volume: library.prefs.volume,
      bass: library.prefs.bass,
      treble: library.prefs.treble,
      repeat: library.prefs.repeat,
      shuffle: library.prefs.shuffle,
    }),
    [
      library.prefs.bass,
      library.prefs.repeat,
      library.prefs.shuffle,
      library.prefs.treble,
      library.prefs.volume,
    ],
  );

  const engine = useAudioEngine(
    library.filtered,
    settings,
    library.updatePrefs,
  );

  const palette = useArtworkColors(
    engine.current?.artworkUrl,
    library.prefs.accentEnabled,
  );

  return (
    <main className="relative flex min-h-0 flex-1 flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 transition-opacity duration-700"
        style={{
          backgroundImage:
            "radial-gradient(58% 42% at 80% 4%, var(--accent-glow), transparent 70%)",
          opacity: library.prefs.accentEnabled ? 0.6 : 0,
        }}
      />

      <header className="mx-auto flex w-full max-w-[1600px] items-center gap-4 px-4 pb-4 pt-6 sm:px-6 sm:pt-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-on-accent shadow-[0_12px_28px_-14px_var(--accent-glow)]">
            <NoteIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight tracking-tight text-ink">
              Music Cherry
            </h1>
            <p className="text-xs text-muted">Powered by Next.JS</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col px-4 pb-6 sm:px-6">
        <LibraryPanel
          library={library}
          engine={engine}
          currentId={engine.current?.id ?? null}
          accentEnabled={library.prefs.accentEnabled}
          onToggleAccent={() =>
            library.updatePrefs({ accentEnabled: !library.prefs.accentEnabled })
          }
          onAddLocal={(files) => void library.addFiles(files)}
          onAddUrl={(url) => void library.addUrl(url)}
        />
      </div>

      <PlayerBar
        track={engine.current}
        engine={engine}
        onExpand={() => setNowPlayingOpen(true)}
      />

      <NowPlaying
        track={engine.current}
        engine={engine}
        open={nowPlayingOpen}
        palette={palette}
        onClose={() => setNowPlayingOpen(false)}
      />

      <span className="sr-only" aria-live="polite">
        {engine.current && engine.isPlaying
          ? `Playing ${engine.current.title} by ${engine.current.artist}`
          : "Paused"}
      </span>
    </main>
  );
}
