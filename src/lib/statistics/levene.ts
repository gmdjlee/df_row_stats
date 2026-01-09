import { mean } from '../utils/math';
import { ttest } from './ttest';

/**
 * Levene's Test for Equal Variances
 */
export function levene(group1: number[], group2: number[]): number {
  const g1 = group1.filter(x => !isNaN(x));
  const g2 = group2.filter(x => !isNaN(x));

  const m1 = mean(g1);
  const m2 = mean(g2);

  const z1 = g1.map(x => Math.abs(x - m1));
  const z2 = g2.map(x => Math.abs(x - m2));

  const result = ttest(z1, z2, true);
  return result.pValue;
}
