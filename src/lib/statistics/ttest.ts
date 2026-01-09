import jstat from 'jstat';
import { mean, variance } from '../utils/math';

export interface TTestResult {
  statistic: number;
  pValue: number;
  df: number;
  testType: 'T-test' | 'Welch T-test';
}

/**
 * Independent T-test
 */
export function ttest(
  group1: number[],
  group2: number[],
  equalVar = true
): TTestResult {
  const g1 = group1.filter(x => !isNaN(x));
  const g2 = group2.filter(x => !isNaN(x));

  const n1 = g1.length;
  const n2 = g2.length;
  const m1 = mean(g1);
  const m2 = mean(g2);
  const v1 = variance(g1);
  const v2 = variance(g2);

  if (equalVar) {
    // Pooled variance
    const pooled = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2);
    const se = Math.sqrt(pooled * (1 / n1 + 1 / n2));
    const t = (m1 - m2) / se;
    const df = n1 + n2 - 2;
    const p = 2 * (1 - jstat.studentt.cdf(Math.abs(t), df));

    return { statistic: t, pValue: p, df, testType: 'T-test' };
  } else {
    // Welch's T-test
    const se = Math.sqrt(v1 / n1 + v2 / n2);
    const t = (m1 - m2) / se;
    const df = Math.pow(v1 / n1 + v2 / n2, 2) /
      (Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1));
    const p = 2 * (1 - jstat.studentt.cdf(Math.abs(t), df));

    return { statistic: t, pValue: p, df, testType: 'Welch T-test' };
  }
}
