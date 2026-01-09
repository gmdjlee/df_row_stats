# 단계별 구현 가이드

## Step 1: 프로젝트 초기화

### ⚠️ 보안 요구사항 (반드시 준수)

```
┌─────────────────────────────────────────────────────────────┐
│  🔒 LOCAL-ONLY DATA PROCESSING                              │
│                                                             │
│  • 모든 데이터는 브라우저 내에서만 처리                      │
│  • 네트워크 요청 절대 금지                                  │
│  • 외부 CDN, Google Fonts 등 외부 리소스 금지              │
│  • localStorage/sessionStorage 사용 금지                   │
│  • 오프라인 실행 가능해야 함                               │
└─────────────────────────────────────────────────────────────┘
```

### 1.1 Vite 프로젝트 생성
```bash
npm create vite@latest . -- --template react-ts
npm install
```

### 1.2 의존성 설치
```bash
# 핵심 라이브러리
npm install recharts jstat lodash papaparse
npm install -D @types/lodash @types/papaparse

# Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 1.3 Tailwind 설정
```javascript
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        danger: '#dc2626',
        warning: '#f59e0b',
      }
    }
  },
  plugins: []
}
```

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 1.4 디렉토리 구조 생성
```bash
mkdir -p src/{components,lib/{outlier,statistics,utils},types,hooks}
```

---

## Step 2: 타입 정의

### 2.1 `src/types/index.ts`
```typescript
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
```

---

## Step 3: 유틸리티 함수

### 3.1 `src/lib/utils/math.ts`
```typescript
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
```

### 3.2 `src/lib/utils/parser.ts`
```typescript
import Papa from 'papaparse';

export interface ParseConfig {
  delimiter?: 'auto' | '\t' | ',' | ' ';
  hasHeader?: boolean;
  hasRowIndex?: boolean;
}

/**
 * 구분자 자동 감지
 */
export function detectDelimiter(text: string): string {
  const firstLine = text.split('\n')[0];
  const counts: Record<string, number> = { '\t': 0, ',': 0, ' ': 0 };
  
  for (const char of firstLine) {
    if (char in counts) counts[char]++;
  }
  
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * 텍스트 파싱
 */
export function parseText(
  text: string, 
  config: ParseConfig = {}
): { data: number[][]; headers?: string[]; rowIds?: string[] } {
  const delimiter = config.delimiter === 'auto' 
    ? detectDelimiter(text) 
    : config.delimiter || '\t';
  
  const lines = text.trim().split('\n');
  let headers: string[] | undefined;
  let startIdx = 0;
  
  if (config.hasHeader) {
    headers = lines[0].split(delimiter).map(h => h.trim());
    startIdx = 1;
  }
  
  const rowIds: string[] = [];
  const data: number[][] = [];
  
  for (let i = startIdx; i < lines.length; i++) {
    const cells = lines[i].split(delimiter);
    
    if (config.hasRowIndex) {
      rowIds.push(cells[0].trim());
      data.push(cells.slice(1).map(c => parseFloat(c.trim())));
    } else {
      rowIds.push(`Row_${i - startIdx + 1}`);
      data.push(cells.map(c => parseFloat(c.trim())));
    }
  }
  
  return { data, headers, rowIds };
}

/**
 * CSV 파일 파싱
 */
export function parseCSVFile(file: File): Promise<{ data: number[][]; headers?: string[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (result) => {
        const rows = result.data as string[][];
        const headers = rows[0];
        const data = rows.slice(1).map(row => 
          row.map(cell => parseFloat(cell) || NaN)
        );
        resolve({ data, headers });
      },
      error: (error) => reject(error)
    });
  });
}
```

---

## Step 4: 이상치 탐지 모듈

### 4.1 `src/lib/outlier/zscore.ts`
```typescript
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
```

### 4.2 `src/lib/outlier/iqr.ts`
```typescript
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
```

### 4.3 `src/lib/outlier/mad.ts`
```typescript
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
```

### 4.4 `src/lib/outlier/index.ts`
```typescript
import { detectZScore, ZScoreConfig } from './zscore';
import { detectIQR, IQRConfig } from './iqr';
import { detectMAD, MADConfig } from './mad';
import { OutlierMethod, OutlierConfig, OutlierResult, OutlierAction } from '../../types';
import { mean, median } from '../utils/math';

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
  
  return {
    method,
    outlierCount,
    outlierRatio: totalCells > 0 ? outlierCount / totalCells : 0,
    outlierMask,
    outlierIndices,
    bounds: allBounds,
    statistics: allStats,
    cleanedData: applyOutlierAction(data, outlierMask, 'replace_nan')
  };
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
```

---

## Step 5: 통계 분석 모듈

### 5.1 `src/lib/statistics/ttest.ts`
```typescript
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
```

### 5.2 `src/lib/statistics/levene.ts`
```typescript
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
```

### 5.3 `src/lib/statistics/anova.ts`
```typescript
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
```

### 5.4 `src/lib/statistics/index.ts`
```typescript
import { ttest, TTestResult } from './ttest';
import { levene } from './levene';
import { anova, AnovaResult } from './anova';
import { StatsConfig, StatsResult, TestType } from '../../types';
import { mean } from '../utils/math';

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
  
  return results;
}

export { ttest, levene, anova };
```

---

## Step 6: React 컴포넌트 (계속)

문서가 길어져서 컴포넌트 구현은 별도 파일로 분리합니다.
`docs/COMPONENT_IMPLEMENTATION.md` 참조.

---

## Step 7: 테스트 데이터

### 샘플 데이터 (Copy & Paste용)
```
10.5	11.2	10.8	9.9	10.3
11.0	10.5	11.3	10.2	10.8
9.8	10.1	10.9	11.5	10.3
10.2	10.0	9.5	10.4	10.1
10.2	10.8	11.0	10.6	10.9
100.0	10.3	10.7	10.5	10.2
10.1	-50.0	10.4	10.8	10.6
```

### 예상 결과
- 이상치: (5,0)=100.0, (6,1)=-50.0
- IQR(k=1.5) 또는 Z-Score(threshold=3.0)로 탐지

---

## 완료 체크리스트

### 기능 구현
- [ ] 프로젝트 초기화
- [ ] 타입 정의 완료
- [ ] 유틸리티 함수 구현
- [ ] 이상치 탐지 알고리즘 구현
- [ ] 통계 분석 알고리즘 구현
- [ ] UI 컴포넌트 구현
- [ ] 시각화 구현
- [ ] 결과 내보내기
- [ ] 에러 핸들링
- [ ] 반응형 디자인
- [ ] 테스트

### ⚠️ 보안 검증 (필수)
- [ ] `grep -r "fetch\|axios\|XMLHttpRequest" src/` → 결과 없음
- [ ] `grep -r "localStorage\|sessionStorage\|indexedDB" src/` → 결과 없음
- [ ] `grep -r "googleapis\|cdn\." src/` → 결과 없음
- [ ] `grep -r "analytics\|gtag\|ga\(" src/` → 결과 없음
- [ ] 오프라인 모드에서 정상 작동 확인
- [ ] 네트워크 탭에서 외부 요청 없음 확인
