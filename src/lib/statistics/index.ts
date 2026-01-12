import { ttest } from './ttest';
import { levene } from './levene';
import { anova } from './anova';
import { StatsConfig, StatsResult, TestType } from '../../types';
import { mean } from '../utils/math';
import { statsLogger, logAnalysisSummary } from '../utils/logger';

const DEFAULT_CONFIG: StatsConfig = {
  alpha: 0.05,
  minSamples: 2
};

/**
 * 행별 통계 분석 수행
 */
export function analyzeRows(
  dataframes: number[][][],  // [group][row][col]
  rowIds: string[],
  config: StatsConfig = DEFAULT_CONFIG
): StatsResult[] {
  const results: StatsResult[] = [];
  const numRows = dataframes[0].length;
  const numGroups = dataframes.length;

  statsLogger.time('statistical-analysis');
  statsLogger.info(`Starting statistical analysis: ${numRows} rows, ${numGroups} groups`);
  statsLogger.debug('Config:', config);

  for (let i = 0; i < numRows; i++) {
    // 각 그룹의 i번째 행 데이터 추출
    const groups = dataframes.map(df => df[i].filter(x => !isNaN(x)));

    // 최소 샘플 수 체크
    if (groups.some(g => g.length < config.minSamples)) {
      results.push({
        rowId: rowIds[i],
        groupMeans: {},
        testType: 'T-test',
        statistic: NaN,
        pValue: 1.0,
        isSignificant: false,
        leveneP: NaN,
        equalVariance: true
      });
      continue;
    }

    // 그룹 평균 계산
    const groupMeans: Record<string, number> = {};
    groups.forEach((g, idx) => {
      groupMeans[`Group${idx + 1}_Mean`] = mean(g);
    });

    let testResult: { statistic: number; pValue: number; testType: TestType };
    let leveneP = 1.0;
    let equalVar = true;

    if (numGroups === 2) {
      // T-test
      leveneP = levene(groups[0], groups[1]);
      equalVar = leveneP > config.alpha;
      const ttestResult = ttest(groups[0], groups[1], equalVar);
      testResult = ttestResult;
    } else {
      // ANOVA
      const anovaResult = anova(...groups);
      testResult = anovaResult;
    }

    results.push({
      rowId: rowIds[i],
      groupMeans,
      testType: testResult.testType,
      statistic: testResult.statistic,
      pValue: testResult.pValue,
      isSignificant: testResult.pValue < config.alpha,
      leveneP,
      equalVariance: equalVar
    });
  }

  statsLogger.timeEnd('statistical-analysis');
  logAnalysisSummary.stats(results);

  return results;
}

export { ttest, levene, anova };
