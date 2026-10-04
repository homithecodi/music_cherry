export type Rgb = { r: number; g: number; b: number };
export type Hsl = { h: number; s: number; l: number };

export type Palette = {
  accent: string;
  accentSoft: string;
  ring: string;
  gradient: [string, string, string];
  glow: string;
  onAccent: string;
};

export const DEFAULT_PALETTE: Palette = {
  accent: "#f43f5e",
  accentSoft: "#fb7185",
  ring: "#f43f5e",
  gradient: ["#1e1b4b", "#4c1d95", "#831843"],
  glow: "rgba(244, 63, 94, 0.35)",
  onAccent: "#ffffff",
};

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) return { h: 0, s: 0, l };

  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let h: number;
  if (max === rn) h = ((gn - bn) / delta) % 6;
  else if (max === gn) h = (bn - rn) / delta + 2;
  else h = (rn - gn) / delta + 4;

  h *= 60;
  if (h < 0) h += 360;

  return { h, s, l };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hn = ((h % 360) + 360) % 360;
  const sn = Math.min(Math.max(s, 0), 1);
  const ln = Math.min(Math.max(l, 0), 1);
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = ln - c / 2;

  let rgb: [number, number, number];
  if (hn < 60) rgb = [c, x, 0];
  else if (hn < 120) rgb = [x, c, 0];
  else if (hn < 180) rgb = [0, c, x];
  else if (hn < 240) rgb = [0, x, c];
  else if (hn < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  return {
    r: Math.round((rgb[0] + m) * 255),
    g: Math.round((rgb[1] + m) * 255),
    b: Math.round((rgb[2] + m) * 255),
  };
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (n: number) => n.toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function toRgba({ r, g, b }: Rgb, alpha: number): string {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function hsl({ h, s, l }: Hsl): string {
  const part = (n: number) => n.toFixed(1);
  return `hsl(${part(h)} ${part(s * 100)}% ${part(l * 100)}%)`;
}

export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function saturation(rgb: Rgb): number {
  return rgbToHsl(rgb).s;
}

function lightness(rgb: Rgb): number {
  return rgbToHsl(rgb).l;
}

export function buildPalette(colors: Rgb[]): Palette {
  const swatches = colors.filter((c) => saturation(c) > 0.05);

  if (swatches.length === 0) return DEFAULT_PALETTE;

  const sorted = [...swatches].sort((a, b) => {
    const score = (c: Rgb) => saturation(c) * 1.4 + (1 - Math.abs(lightness(c) - 0.58)) * 0.6;
    return score(b) - score(a);
  });

  const primary = sorted[0];
  const distinctHue = (candidate: Rgb, from: number, minDelta: number) =>
    Math.abs(rgbToHsl(candidate).h - from) >= minDelta;

  const secondary =
    sorted.find((c) => distinctHue(c, rgbToHsl(primary).h, 40)) ?? sorted[1] ?? primary;
  const tertiary =
    sorted.find((c) => distinctHue(c, rgbToHsl(secondary).h, 40)) ??
    sorted[2] ??
    secondary;

  const primaryHsl = rgbToHsl(primary);
  const accentL = clamp(primaryHsl.l, 0.52, 0.72);
  const accentRgb = hslToRgb({ ...primaryHsl, l: accentL, s: clamp(primaryHsl.s, 0.45, 1) });
  const onAccent = contrastRatio(accentRgb, { r: 255, g: 255, b: 255 }) >= 4.2
    ? "#ffffff"
    : "#0b0b0f";

  const backdrops = [primary, secondary, tertiary].map((c, index) => {
    const base = rgbToHsl(c);
    return hslToRgb({
      h: base.h + index * 8,
      s: clamp(base.s, 0.35, 0.85),
      l: 0.16 + index * 0.035,
    });
  });

  const gradient = backdrops.map(toHex) as [string, string, string];

  return {
    accent: toHex(accentRgb),
    accentSoft: toHex(
      hslToRgb({ ...primaryHsl, l: clamp(accentL + 0.12, 0, 0.86), s: clamp(primaryHsl.s, 0.4, 1) }),
    ),
    ring: toHex(accentRgb),
    gradient,
    glow: toRgba(accentRgb, 0.42),
    onAccent,
  };
}

export function paletteToCssVars(palette: Palette): Record<string, string> {
  return {
    "--accent": palette.accent,
    "--accent-soft": palette.accentSoft,
    "--accent-glow": palette.glow,
    "--on-accent": palette.onAccent,
    "--art-a": palette.gradient[0],
    "--art-b": palette.gradient[1],
    "--art-c": palette.gradient[2],
  };
}

export function quantize(image: ImageData, sampleStep = 2): Rgb[] {
  const { data, width, height } = image;
  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();

  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      const offset = (y * width + x) * 4;
      const alpha = data[offset + 3];
      if (alpha < 125) continue;

      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];

      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.r += r;
        bucket.g += g;
        bucket.b += b;
        bucket.n += 1;
      } else {
        buckets.set(key, { r, g, b, n: 1 });
      }
    }
  }

  return [...buckets.values()]
    .map((bucket) => ({
      r: Math.round(bucket.r / bucket.n),
      g: Math.round(bucket.g / bucket.n),
      b: Math.round(bucket.b / bucket.n),
    }))
    .sort((a, b) => {
      const weight = (c: Rgb) => saturation(c) * (1 - Math.abs(lightness(c) - 0.5));
      return weight(b) - weight(a);
    })
    .slice(0, 12);
}