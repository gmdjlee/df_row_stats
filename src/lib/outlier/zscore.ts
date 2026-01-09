import { mean, std } from '../utils/math';

export interface ZScoreConfig {
  threshold: number;
}

export interface ZScoreResult {
  mask: boolean[];
  bounds: { lower: number; upper: number };
  stats: { mean: number; std: number; threshold: number };
}

export function detectZScore(
  data: number[],
  config: ZScoreConfig = { threshold: 3.0 }
): ZScoreResult {
  const m = mean(data);
  const s = std(data);

  if (s === 0 || isNaN(s)) {
    return {
      mask: data.map(() => false),
      bounds: { lower: m, upper: m },
      stats: { mean: m, std: s, threshold: config.threshold }
    };
  }

  const lower = m - config.threshold * s;
  const upper = m + config.threshold * s;

  return {
    mask: data.map(x => isNaN(x) ? false : Math.abs((x - m) / s) > config.threshold),
    bounds: { lower, upper },
    stats: { mean: m, std: s, threshold: config.threshold }
  };
}
