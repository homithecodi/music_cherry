export const FFT_SIZE = 4096;
export const BIN_COUNT = FFT_SIZE / 2;
export const MIN_HZ = 40;
export const MAX_HZ = 16000;
export const SHAPE_SPAN_DB = 60;
export const SHAPE_MIDPOINT = 0.5;
export const TILT_TOTAL_DB = 16;
export const SILENCE_RMS = 0.0004;
export const RMS_DECAY = 0.985;
export const MIN_REF_RMS = 0.0012;
export const TRANSIENT_WEIGHT = 0.3;

export function createSpectrumBuffer(): Float32Array<ArrayBuffer> {
  return new Float32Array(BIN_COUNT);
}

export function createWaveBuffer(): Float32Array<ArrayBuffer> {
  return new Float32Array(FFT_SIZE);
}

export function bandEdges(bars: number, sampleRate: number): [number, number][] {
  const hzPerBin = sampleRate / FFT_SIZE;
  const low = Math.log(MIN_HZ);
  const high = Math.log(MAX_HZ);
  const edges: [number, number][] = [];
  let cursor = 1;

  for (let i = 0; i < bars; i += 1) {
    const startHz = Math.exp(low + ((high - low) * i) / bars);
    const endHz = Math.exp(low + ((high - low) * (i + 1)) / bars);

    const wantedFrom = Math.max(1, Math.round(startHz / hzPerBin));
    const from = Math.max(cursor, Math.min(wantedFrom, BIN_COUNT - 1));
    const wantedTo = Math.max(from + 1, Math.round(endHz / hzPerBin));

    edges.push([from, Math.min(BIN_COUNT, wantedTo)]);
    cursor = from + 1;
  }

  return edges;
}

export function readBandDb(
  db: Float32Array<ArrayBuffer>,
  bars: number,
  sampleRate: number,
  out: Float32Array,
): void {
  const edges = bandEdges(bars, sampleRate);

  for (let i = 0; i < bars; i += 1) {
    const [from, to] = edges[i];
    let sum = 0;
    let count = 0;
    let loudest = -Infinity;

    for (let bin = from; bin < to; bin += 1) {
      const value = db[bin];
      if (!Number.isFinite(value)) continue;
      sum += value;
      count += 1;
      if (value > loudest) loudest = value;
    }

    const mean = count > 0 ? sum / count : -200;
    const peak = count > 0 ? loudest : -200;
    out[i] = mean * (1 - TRANSIENT_WEIGHT) + peak * TRANSIENT_WEIGHT;
  }
}

export function readRms(wave: Float32Array<ArrayBuffer>): number {
  let sum = 0;
  for (let i = 0; i < wave.length; i += 1) {
    sum += wave[i] * wave[i];
  }
  return Math.sqrt(sum / wave.length);
}

export function tiltFor(index: number, bars: number): number {
  if (bars <= 1) return 0;
  return (TILT_TOTAL_DB * index) / (bars - 1);
}
