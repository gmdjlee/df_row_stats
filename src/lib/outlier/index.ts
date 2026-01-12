import { detectZScore } from './zscore';
import { detectIQR } from './iqr';
import { detectMAD } from './mad';
import { OutlierConfig, OutlierResult, OutlierAction } from '../../types';
import { mean, median } from '../utils/math';
import { outlierLogger, logAnalysisSummary } from '../utils/logger';

/**
 * 2D 데이터에 대한 이상치 탐지
 */
export function detectOutliers(
  data: number[][],
  config: OutlierConfig
): OutlierResult {
  const { method } = config;
  const outlierMask: boolean[][] = [];
  const outlierIndices: Array<[number, number]> = [];
  let allBounds: { lower: number; upper: number } | undefined;
  const allStats: Record<string, number> = {};

  outlierLogger.time('outlier-detection');
  outlierLogger.info(`Starting outlier detection with method: ${method}`);
  outlierLogger.debug('Config:', config);
  outlierLogger.debug(`Data dimensions: ${data.length} rows × ${data[0]?.length || 0} cols`);

  // 행별로 탐지
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    let result;

    switch (method) {
      case 'zscore':
        result = detectZScore(row, { threshold: config.threshold || 3.0 });
        break;
      case 'iqr':
        result = detectIQR(row, { multiplier: config.multiplier || 1.5 });
        break;
      case 'mad':
        result = detectMAD(row, { threshold: config.threshold || 3.5 });
        break;
      default:
        result = detectIQR(row, { multiplier: 1.5 });
    }

    outlierMask.push(result.mask);

    // 이상치 인덱스 수집
    result.mask.forEach((isOutlier, j) => {
      if (isOutlier) outlierIndices.push([i, j]);
    });

    if (i === 0) {
      allBounds = result.bounds;
    }
  }

  const outlierCount = outlierIndices.length;
  const totalCells = data.length * (data[0]?.length || 0);
  const outlierRatio = totalCells > 0 ? outlierCount / totalCells : 0;

  const result: OutlierResult = {
    method,
    outlierCount,
    outlierRatio,
    outlierMask,
    outlierIndices,
    bounds: allBounds,
    statistics: allStats,
    cleanedData: applyOutlierAction(data, outlierMask, 'replace_nan')
  };

  outlierLogger.timeEnd('outlier-detection');
  logAnalysisSummary.outlier(result);

  if (outlierCount > 0 && outlierCount <= 20) {
    outlierLogger.groupCollapsed('Outlier positions');
    outlierIndices.forEach(([row, col]) => {
      outlierLogger.debug(`  Row ${row}, Col ${col}: ${data[row][col]}`);
    });
    outlierLogger.groupEnd();
  }

  return result;
}

/**
 * 이상치 처리 적용
 */
export function applyOutlierAction(
  data: number[][],
  mask: boolean[][],
  action: OutlierAction
): number[][] {
  return data.map((row, i) => {
    const rowMask = mask[i];

    return row.map((val, j) => {
      if (!rowMask[j]) return val;

      switch (action) {
        case 'replace_nan':
          return NaN;
        case 'replace_mean':
          return mean(row.filter((_, k) => !rowMask[k]));
        case 'replace_median':
          return median(row.filter((_, k) => !rowMask[k]));
        case 'flag_only':
          return val;
        default:
          return NaN;
      }
    });
  });
}

export { detectZScore, detectIQR, detectMAD };
