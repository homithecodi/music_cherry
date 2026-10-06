"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatTime } from "@/lib/format";

function drawPeaks(
  canvas: HTMLCanvasElement | null,
  peaks: Float32Array,
  color: string,
  width: number,
  height: number,
) {
  if (!canvas || width <= 0 || height <= 0) return;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);

  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = color;

  const gap = width > 520 ? 1.5 : 1;
  const minBarWidth = 1;
  const fitting = Math.max(16, Math.floor((width + gap) / (minBarWidth + gap)));
  const count = Math.min(peaks.length, fitting);
  const barWidth = (width - gap * (count - 1)) / count;
  if (barWidth <= 0) return;

  const middle = height / 2;
  const radius = Math.min(barWidth / 2, 2);
  const perBucket = peaks.length / count;

  for (let i = 0; i < count; i += 1) {
    const from = Math.floor(i * perBucket);
    const to = Math.min(peaks.length, Math.max(from + 1, Math.floor((i + 1) * perBucket)));

    let amplitude = 0;
    for (let j = from; j < to; j += 1) {
      if (peaks[j] > amplitude) amplitude = peaks[j];
    }
    amplitude = Math.max(0.035, amplitude);

    const barHeight = amplitude * (height - 2);
    const x = i * (barWidth + gap);

    context.beginPath();
    context.roundRect(x, middle - barHeight / 2, barWidth, barHeight, radius);
    context.fill();
  }
}

export function WaveformSeek({
  peaks,
  status,
  currentTime,
  duration,
  accent,
  restColor,
  onSeek,
}: {
  peaks: Float32Array | null;
  status:
  | "idle"
  | "loading"
  | "analysed"
  | "real-time"
  | "placeholder";
  currentTime: number;
  duration: number;
  accent: string;
  restColor: string;
  onSeek: (time: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const playedRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hover, setHover] = useState<number | null>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentRect;
      setSize({ width: box.width, height: box.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!peaks) return;
    drawPeaks(baseRef.current, peaks, restColor, size.width, size.height);
    drawPeaks(playedRef.current, peaks, accent, size.width, size.height);
  }, [accent, peaks, restColor, size.height, size.width]);

  const fractionFromEvent = useCallback((clientX: number) => {
    const element = containerRef.current;
    if (!element) return 0;
    const rect = element.getBoundingClientRect();
    if (rect.width === 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }, []);

  const seekFromEvent = useCallback(
    (clientX: number) => {
      if (duration > 0) onSeek(fractionFromEvent(clientX) * duration);
    },
    [duration, fractionFromEvent, onSeek],
  );

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const hoverTime = hover !== null && duration > 0 ? hover * duration : null;

  return (
    <div className="flex flex-col gap-1.5">
      <div
        ref={containerRef}
        role="slider"
        tabIndex={0}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.floor(duration)}
        aria-valuenow={Math.floor(currentTime)}
        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
        onPointerDown={(event) => {
          if (duration <= 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          draggingRef.current = true;
          seekFromEvent(event.clientX);
        }}
        onPointerMove={(event) => {
          const next = fractionFromEvent(event.clientX);
          setHover(next);
          if (draggingRef.current) seekFromEvent(event.clientX);
        }}
        onPointerUp={(event) => {
          draggingRef.current = false;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerLeave={() => {
          draggingRef.current = false;
          setHover(null);
        }}
        onKeyDown={(event) => {
          if (duration <= 0) return;
          const step = event.shiftKey ? 30 : 5;
          if (event.key === "ArrowRight") {
            event.preventDefault();
            onSeek(Math.min(duration, currentTime + step));
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            onSeek(Math.max(0, currentTime - step));
          }
        }}
        className={`relative w-full touch-none select-none ${
          duration > 0 ? "cursor-pointer" : "cursor-default opacity-60"
        }`}
        style={{ height: 72 }}
      >
        <canvas ref={baseRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />

        <div
          className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: `${progress * 100}%` }}
          aria-hidden="true"
        >
          <canvas
            ref={playedRef}
            className="absolute inset-y-0 left-0 h-full"
            style={{ width: size.width || "100%" }}
          />
        </div>

        {hover !== null && duration > 0 ? (
          <>
            <div
              className="pointer-events-none absolute inset-y-0 w-px bg-white/70"
              style={{ left: `${hover * 100}%` }}
              aria-hidden="true"
            />
            <div
              className="animate-fade pointer-events-none absolute -top-8 -translate-x-1/2 rounded-md bg-black/75 px-2 py-1 font-mono text-[0.65rem] text-white"
              style={{ left: `${hover * 100}%` }}
              aria-hidden="true"
            >
              {formatTime(hoverTime ?? 0)}
            </div>
          </>
        ) : null}

        {status === "loading" ? (
          <div className="animate-fade absolute inset-0 flex items-center justify-center bg-black/25 text-xs font-medium text-white/90">
            Reading waveform…
          </div>
        ) : null}

        {status === "placeholder" ? (
          <span className="sr-only">Waveform unavailable for this track</span>
        ) : null}
      </div>

      <div className="flex justify-between font-mono text-xs text-white/60">
        <span>{formatTime(currentTime)}</span>
        <span>-{formatTime(Math.max(duration - currentTime, 0))}</span>
      </div>
    </div>
  );
}