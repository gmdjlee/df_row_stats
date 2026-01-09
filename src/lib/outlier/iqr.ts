import { percentile } from '../utils/math';

export interface IQRConfig {
  multiplier: number;
}

export interface IQRResult {
  mask: boolean[];
  bounds: { lower: number; upper: number };
  stats: { q1: number; q3: number; iqr: number; multiplier: number };
}

export function detectIQR(
  data: number[],
  config: IQRConfig = { multiplier: 1.5 }
): IQRResult {
  const q1 = percentile(data, 0.25);
  const q3 = percentile(data, 0.75);
  const iqr = q3 - q1;

  const lower = q1 - config.multiplier * iqr;
  const upper = q3 + config.multiplier * iqr;

  return {
    mask: data.map(x => isNaN(x) ? false : x < lower || x > upper),
    bounds: { lower, upper },
    stats: { q1, q3, iqr, multiplier: config.multiplier }
  };
}
