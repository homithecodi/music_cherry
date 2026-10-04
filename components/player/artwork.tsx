/* eslint-disable @next/next/no-img-element -- artwork comes from user files (blob:) or arbitrary remote URLs, which the Next image optimizer cannot handle */
"use client";

import { useMemo } from "react";
import { NoteIcon } from "./icons";

export type ArtworkProps = {
  src?: string;
  seed: string;
  alt: string;
  className?: string;
  rounded?: string;
};

function hash(value: string): number {
  let out = 0;
  for (let i = 0; i < value.length; i += 1) {
    out = (out << 5) - out + value.charCodeAt(i);
    out |= 0;
  }
  return Math.abs(out);
}

export function Artwork({ src, seed, alt, className = "", rounded = "rounded-2xl" }: ArtworkProps) {
  const gradient = useMemo(() => {
    const base = hash(seed) % 360;
    return `linear-gradient(135deg, hsl(${base} 68% 52%), hsl(${(base + 48) % 360} 72% 44%) 55%, hsl(${(base + 96) % 360} 60% 32%))`;
  }, [seed]);

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`artwork-img h-full w-full object-cover ${rounded} ${className}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={`relative flex h-full w-full items-center justify-center overflow-hidden ${rounded} ${className}`}
      style={{ backgroundImage: gradient }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
      <NoteIcon className="h-1/4 w-1/4 text-white/85 drop-shadow" />
    </div>
  );
}