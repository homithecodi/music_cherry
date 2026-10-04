"use client";

import type { CSSProperties, ReactNode } from "react";

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

export function Equalizer({ live, bars = 4 }: { live: boolean; bars?: number }) {
  return (
    <div className="flex h-4 items-end gap-[3px]" aria-hidden="true">
      {Array.from({ length: bars }, (_, index) => (
        <span
          key={index}
          data-live={live}
          className="eq-bar w-[3px] rounded-full bg-current"
          style={{
            height: "100%",
            animationDelay: `${index * 130}ms`,
            animationDuration: `${760 + index * 90}ms`,
          }}
        />
      ))}
    </div>
  );
}