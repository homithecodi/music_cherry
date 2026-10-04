"use client";

import type { Theme } from "@/hooks/use-theme";
import { MoonIcon, SunIcon } from "./icons";
import { IconButton } from "./ui";

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <IconButton
      onClick={onToggle}
      label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </IconButton>
  );
}