"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_PALETTE, buildPalette, paletteToCssVars, quantize } from "@/lib/color";
import type { Palette } from "@/lib/color";

const SAMPLE_SIZE = 48;

const NEUTRAL: Palette = {
  ...DEFAULT_PALETTE,
  accent: "#fb7185",
  accentSoft: "#fda4af",
  glow: "rgba(251, 113, 133, 0.35)",
};

export function useArtworkColors(artworkUrl: string | undefined, enabled: boolean) {
  const [sampled, setSampled] = useState<Palette | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!enabled || !artworkUrl) return;

    const token = ++requestRef.current;
    const image = new Image();

    image.onload = () => {
      if (requestRef.current !== token) return;
      try {
        const canvas = document.createElement("canvas");
        const size = Math.min(SAMPLE_SIZE, image.naturalWidth || SAMPLE_SIZE);
        canvas.width = size;
        canvas.height = size;

        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          setSampled(null);
          return;
        }

        context.drawImage(image, 0, 0, size, size);
        const swatches = quantize(context.getImageData(0, 0, size, size), 1);
        setSampled(swatches.length > 0 ? buildPalette(swatches) : null);
      } catch {
        setSampled(null);
      }
    };

    image.onerror = () => {
      if (requestRef.current === token) setSampled(null);
    };

    image.src = artworkUrl;

    return () => {
      requestRef.current += 1;
    };
  }, [artworkUrl, enabled]);

  const palette = useMemo(() => {
    if (!enabled || !artworkUrl) return NEUTRAL;
    return sampled ?? NEUTRAL;
  }, [artworkUrl, enabled, sampled]);

  useEffect(() => {
    const style = document.documentElement.style;
    for (const [name, value] of Object.entries(paletteToCssVars(palette))) {
      style.setProperty(name, value);
    }
  }, [palette]);

  return palette;
}