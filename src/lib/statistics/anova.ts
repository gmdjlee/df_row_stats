import jstat from 'jstat';
import { mean } from '../utils/math';

export interface AnovaResult {
  statistic: number;
  pValue: number;
  dfBetween: number;
  dfWithin: number;
  testType: 'ANOVA';
}

/**
 * One-way ANOVA
 */
export function anova(...groups: number[][]): AnovaResult {
  const cleanGroups = groups.map(g => g.filter(x => !isNaN(x)));
  const allData = cleanGroups.flat();
  const grandMean = mean(allData);

  // Between-group variance
  let ssBetween = 0;
  for (const g of cleanGroups) {
    const groupMean = mean(g);
    ssBetween += g.length * Math.pow(groupMean - grandMean, 2);
  }

  // Within-group variance
  let ssWithin = 0;
  for (const g of cleanGroups) {
    const groupMean = mean(g);
    for (const x of g) {
      ssWithin += Math.pow(x - groupMean, 2);
    }
  }

  const k = cleanGroups.length;
  const n = allData.length;
  const dfBetween = k - 1;
  const dfWithin = n - k;

  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;
  const f = msBetween / msWithin;

  const p = 1 - jstat.centralF.cdf(f, dfBetween, dfWithin);

  return {
    statistic: f,
    pValue: p,
    dfBetween,
    dfWithin,
    testType: 'ANOVA'
  };
}
