"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { BAND_COUNT } from "@/lib/spectrum";

export function Slider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  disabled,
  label,
  className = "",
  style,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  label: string;
  className?: string;
  style?: CSSProperties;
}) {
  const fill = max === min ? 0 : ((value - min) / (max - min)) * 100;

  return (
    <input
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value))}
      className={className}
      style={{ ...style, "--fill": `${fill}%` } as CSSProperties}
    />
  );
}

export function IconButton({
  onClick,
  label,
  children,
  active = false,
  size = "md",
  className = "",
  disabled,
}: {
  onClick?: () => void;
  label: string;
  children: ReactNode;
  active?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
}) {
  const sizes = {
    sm: "h-9 w-9 rounded-xl",
    md: "h-11 w-11 rounded-2xl",
    lg: "h-16 w-16 rounded-full",
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      className={`inline-flex shrink-0 items-center justify-center transition duration-200 disabled:pointer-events-none disabled:opacity-40 ${sizes[size]} ${
        active
          ? "bg-accent text-on-accent shadow-[0_10px_30px_-12px_var(--accent-glow)]"
          : "text-muted hover:bg-surface-raised hover:text-ink"
      } ${className}`}
    >
      {children}
    </button>
  );
}

const REST_HEIGHT = 0.14;

export function Equalizer({
  readBands,
  live,
  bars = 5,
  className = "",
}: {
  readBands?: (out: Float32Array) => boolean;
  live: boolean;
  bars?: number;
  className?: string;
}) {
  const nodesRef = useRef<(HTMLSpanElement | null)[]>([]);
  const levelsRef = useRef<Float32Array>(new Float32Array(BAND_COUNT));
  const frameRef = useRef<number | null>(null);
  const count = Math.min(bars, BAND_COUNT);
  const active = Boolean(readBands) && live;

  useEffect(() => {
    const nodes = nodesRef.current;
    const levels = levelsRef.current;

    const paint = () => {
      for (let i = 0; i < count; i += 1) {
        const node = nodes[i];
        if (node) node.style.transform = `scaleY(${levels[i].toFixed(3)})`;
      }
    };

    if (!active) {
      const settle = () => {
        let moving = false;
        for (let i = 0; i < count; i += 1) {
          if (levels[i] > REST_HEIGHT) {
            levels[i] = Math.max(REST_HEIGHT, levels[i] - 0.08);
            moving = true;
          }
          const node = nodes[i];
          if (node) node.style.transform = `scaleY(${levels[i].toFixed(3)})`;
        }
        if (moving) frameRef.current = requestAnimationFrame(settle);
      };
      frameRef.current = requestAnimationFrame(settle);
      return () => {
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      };
    }

    const tick = () => {
      const usable = readBands?.(levels) === true;

      for (let i = 0; i < count; i += 1) {
        const measured = usable ? levels[i] ?? 0 : 0;
        const target = REST_HEIGHT + measured * (1 - REST_HEIGHT);
        levels[i] = target > levels[i] ? target : levels[i] * 0.82 + target * 0.18;
      }

      paint();
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [active, count, readBands]);

  return (
    <div
      className={`flex h-4 items-center justify-center gap-[2px] ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          ref={(node) => {
            nodesRef.current[index] = node;
          }}
          className="w-[3px] origin-center rounded-full bg-current"
          style={{ height: "100%", transform: `scaleY(${REST_HEIGHT})` }}
        />
      ))}
    </div>
  );
}