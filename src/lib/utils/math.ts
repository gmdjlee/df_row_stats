/**
 * 평균 계산
 */
export function mean(arr: number[]): number {
  const clean = arr.filter(x => !isNaN(x) && isFinite(x));
  if (clean.length === 0) return NaN;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

/**
 * 표준편차 계산 (표본)
 */
export function std(arr: number[], ddof = 1): number {
  const clean = arr.filter(x => !isNaN(x) && isFinite(x));
  if (clean.length <= ddof) return NaN;
  const m = mean(clean);
  const variance = clean.reduce((sum, x) => sum + (x - m) ** 2, 0) / (clean.length - ddof);
  return Math.sqrt(variance);
}

/**
 * 분산 계산
 */
export function variance(arr: number[], ddof = 1): number {
  const s = std(arr, ddof);
  return s * s;
}

/**
 * 중앙값 계산
 */
export function median(arr: number[]): number {
  const clean = arr.filter(x => !isNaN(x) && isFinite(x)).sort((a, b) => a - b);
  if (clean.length === 0) return NaN;
  const mid = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2;
}

/**
 * 백분위수 계산
 */
export function percentile(arr: number[], p: number): number {
  const clean = arr.filter(x => !isNaN(x) && isFinite(x)).sort((a, b) => a - b);
  if (clean.length === 0) return NaN;
  const idx = (clean.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  const frac = idx - lower;
  return clean[lower] * (1 - frac) + clean[upper] * frac;
}

/**
 * MAD (Median Absolute Deviation)
 */
export function mad(arr: number[]): number {
  const med = median(arr);
  return median(arr.map(x => Math.abs(x - med)));
}
