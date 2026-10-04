"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const THEME_KEY = "music-cherry:theme";
const CHANGE_EVENT = "music-cherry:theme-change";
const SERVER_THEME: Theme = "dark";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

function readTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    /* storage unavailable */
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function writeTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage unavailable */
  }
  document.documentElement.setAttribute("data-theme", theme);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: light)");
  const handleChange = (event: MediaQueryListEvent) => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(THEME_KEY);
    } catch {
      /* storage unavailable */
    }
    if (isTheme(stored)) return;
    const next: Theme = event.matches ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    onChange();
  };

  media.addEventListener("change", handleChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);

  return () => {
    media.removeEventListener("change", handleChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const theme = useSyncExternalStore(subscribe, readTheme, () => SERVER_THEME);

  const toggle = useCallback(() => {
    writeTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  }, []);

  return { theme, toggle };
}