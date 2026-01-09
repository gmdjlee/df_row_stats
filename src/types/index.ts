// 데이터 타입
export interface DataMatrix {
  data: number[][];
  headers?: string[];
  rowIds?: string[];
}

// 이상치 탐지
export type OutlierMethod = 'zscore' | 'iqr' | 'mad' | 'grubbs' | 'winsorize';

export type OutlierAction =
  | 'remove'
  | 'replace_nan'
  | 'replace_mean'
  | 'replace_median'
  | 'flag_only';

export interface OutlierConfig {
  method: OutlierMethod;
  threshold?: number;    // Z-Score, MAD
  multiplier?: number;   // IQR
  alpha?: number;        // Grubbs
  limits?: [number, number]; // Winsorize
}

export interface OutlierResult {
  method: OutlierMethod;
  outlierCount: number;
  outlierRatio: number;
  outlierMask: boolean[][];
  outlierIndices: Array<[number, number]>;
  bounds?: { lower: number; upper: number };
  statistics: Record<string, number>;
  cleanedData: number[][];
}

// 통계 분석
export type TestType = 'T-test' | 'Welch T-test' | 'ANOVA';

export interface StatsConfig {
  alpha: number;
  minSamples: number;
}

export interface StatsResult {
  rowId: string;
  groupMeans: Record<string, number>;
  testType: TestType;
  statistic: number;
  pValue: number;
  isSignificant: boolean;
  leveneP: number;
  equalVariance: boolean;
}

// 앱 상태
export interface AppState {
  rawData: DataMatrix | null;
  cleanedData: DataMatrix | null;
  outlierResult: OutlierResult | null;
  statsResults: StatsResult[] | null;
  isLoading: boolean;
  error: string | null;
}
