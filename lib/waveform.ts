export const WAVEFORM_RESOLUTION = 480;
export const MAX_DECODE_BYTES = 96 * 1024 * 1024;

function hash(value: string): number {
  let out = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    out ^= value.charCodeAt(i);
    out = Math.imul(out, 16777619);
  }
  return out >>> 0;
}

const TRANSIENT_WEIGHT = 0.28;
const MIN_WINDOW_DB = 14;
const MAX_WINDOW_DB = 48;
const FLOOR_PERCENTILE = 0.1;
const CEILING_PERCENTILE = 0.98;
const MAX_ITERATION_SAMPLES = 160_000_000;

function percentileOf(values: Float32Array, fraction: number): number {
  const sorted = Float32Array.from(values).sort();
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round((sorted.length - 1) * fraction)),
  );
  return sorted[index];
}

function smooth(values: Float32Array): Float32Array {
  const out = new Float32Array(values.length);
  for (let i = 0; i < values.length; i += 1) {
    const before = values[Math.max(0, i - 1)];
    const after = values[Math.min(values.length - 1, i + 1)];
    out[i] = before * 0.2 + values[i] * 0.6 + after * 0.2;
  }
  return out;
}

function toDb(value: number): number {
  return value > 0 ? 20 * Math.log10(value) : -120;
}

function shape(peaks: Float32Array): Float32Array {
  if (peaks.length === 0) return peaks;

  const floor = percentileOf(peaks, FLOOR_PERCENTILE);
  const ceiling = percentileOf(peaks, CEILING_PERCENTILE);
  if (ceiling <= 0.0001) return peaks;

  const window = Math.min(
    MAX_WINDOW_DB,
    Math.max(MIN_WINDOW_DB, toDb(ceiling) - toDb(floor)),
  );
  const threshold = toDb(ceiling) - window;
  const scaled = new Float32Array(peaks.length);

  for (let i = 0; i < peaks.length; i += 1) {
    const position = (toDb(peaks[i]) - threshold) / window;
    scaled[i] = Math.min(1, Math.max(0, position));
  }

  return smooth(scaled);
}

export function computePeaks(buffer: AudioBuffer, bars: number): Float32Array {
  const channels = Math.min(buffer.numberOfChannels, 2);
  const length = buffer.length;
  const blockSize = Math.max(1, Math.floor(length / bars));
  const stride = length * channels > MAX_ITERATION_SAMPLES ? 2 : 1;
  const peaks = new Float32Array(bars);

  for (let bar = 0; bar < bars; bar += 1) {
    const start = bar * blockSize;
    const end = Math.min(start + blockSize, length);

    let sumSquares = 0;
    let counted = 0;
    let loudest = 0;

    for (let channel = 0; channel < channels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let i = start; i < end; i += stride) {
        const value = data[i];
        sumSquares += value * value;
        counted += 1;
        const magnitude = value < 0 ? -value : value;
        if (magnitude > loudest) loudest = magnitude;
      }
    }

    const rms = counted > 0 ? Math.sqrt(sumSquares / counted) : 0;
    peaks[bar] = rms * (1 - TRANSIENT_WEIGHT) + loudest * TRANSIENT_WEIGHT;
  }

  return shape(peaks);
}

export function syntheticPeaks(bars: number, seed: string): Float32Array {
  const peaks = new Float32Array(bars);
  let state = hash(seed) || 1;

  for (let i = 0; i < bars; i += 1) {
    const position = i / bars;
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const noise = (state % 10007) / 10007;
    const swell = 0.4 + 0.6 * Math.abs(Math.sin(Math.PI * position * 3.1 + 0.4));
    const body = 0.55 + 0.45 * Math.sin(Math.PI * position);
    peaks[i] = Math.max(0.06, Math.min(1, noise * swell * body * 1.35));
  }

  return peaks;
}
