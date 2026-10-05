export const BAND_COUNT = 5;
export const FFT_SIZE = 1024;
export const BIN_COUNT = FFT_SIZE / 2;

const BAND_HZ: [number, number][] = [
  [30, 120],
  [120, 400],
  [400, 1200],
  [1200, 4000],
  [4000, 12000],
];

export type BandLevels = Float32Array;

export function createSpectrumBuffer(): Uint8Array<ArrayBuffer> {
  return new Uint8Array(BIN_COUNT);
}

function bandBounds(sampleRate: number): [number, number][] {
  const hzPerBin = sampleRate / FFT_SIZE;
  return BAND_HZ.map(([low, high]) => [
    Math.max(1, Math.floor(low / hzPerBin)),
    Math.min(BIN_COUNT, Math.ceil(high / hzPerBin)),
  ]);
}

export function readBands(
  spectrum: Uint8Array<ArrayBuffer>,
  sampleRate: number,
  out: BandLevels,
): BandLevels {
  const bounds = bandBounds(sampleRate);

  for (let band = 0; band < BAND_COUNT; band += 1) {
    const [from, to] = bounds[band];
    let sum = 0;
    let count = 0;

    for (let bin = from; bin < to; bin += 1) {
      sum += spectrum[bin] ?? 0;
      count += 1;
    }

    const mean = count > 0 ? sum / count / 255 : 0;
    out[band] = Math.min(1, mean ** 0.72);
  }

  return out;
}
