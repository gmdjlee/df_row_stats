import { median, mad as calcMad } from '../utils/math';

const MAD_SCALE = 0.6745;

export interface MADConfig {
  threshold: number;
}

export interface MADResult {
  mask: boolean[];
  bounds: { lower: number; upper: number };
  stats: { median: number; mad: number; threshold: number };
}

export function detectMAD(
  data: number[],
  config: MADConfig = { threshold: 3.5 }
): MADResult {
  const med = median(data);
  const madValue = calcMad(data);

  if (madValue === 0) {
    return {
      mask: data.map(() => false),
      bounds: { lower: med, upper: med },
      stats: { median: med, mad: madValue, threshold: config.threshold }
    };
  }

  const boundDistance = config.threshold * madValue / MAD_SCALE;
  const lower = med - boundDistance;
  const upper = med + boundDistance;

  return {
    mask: data.map(x => {
      if (isNaN(x)) return false;
      const mz = MAD_SCALE * Math.abs(x - med) / madValue;
      return mz > config.threshold;
    }),
    bounds: { lower, upper },
    stats: { median: med, mad: madValue, threshold: config.threshold }
  };
}
