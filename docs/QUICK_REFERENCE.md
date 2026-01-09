# Quick Reference Card

## 프로젝트 명령어

```bash
# 초기화
npm create vite@latest . -- --template react-ts
npm install recharts jstat lodash papaparse
npm install -D @types/lodash @types/papaparse tailwindcss

# 실행
npm run dev       # 개발 서버
npm run build     # 프로덕션 빌드
npm run preview   # 빌드 미리보기
```

## 핵심 알고리즘

### Z-Score
```
Z = (x - μ) / σ
Outlier: |Z| > threshold (default: 3.0)
```

### IQR
```
Lower = Q1 - k × IQR
Upper = Q3 + k × IQR
Outlier: x < Lower OR x > Upper
Default k = 1.5
```

### Modified Z-Score (MAD)
```
M = 0.6745 × (x - median) / MAD
Outlier: |M| > threshold (default: 3.5)
```

### T-test (Independent)
```
t = (x̄₁ - x̄₂) / √(s²pooled × (1/n₁ + 1/n₂))
df = n₁ + n₂ - 2
```

### Welch's T-test
```
t = (x̄₁ - x̄₂) / √(s₁²/n₁ + s₂²/n₂)
df = Welch-Satterthwaite approximation
```

### One-way ANOVA
```
F = MS_between / MS_within
df_between = k - 1
df_within = n - k
```

## 타입 정의 요약

```typescript
type OutlierMethod = 'zscore' | 'iqr' | 'mad' | 'grubbs' | 'winsorize';
type OutlierAction = 'remove' | 'replace_nan' | 'replace_mean' | 'replace_median';
type TestType = 'T-test' | 'Welch T-test' | 'ANOVA';

interface DataMatrix {
  data: number[][];
  headers?: string[];
  rowIds?: string[];
}

interface OutlierResult {
  method: OutlierMethod;
  outlierCount: number;
  outlierRatio: number;
  outlierMask: boolean[][];
  bounds?: { lower: number; upper: number };
  cleanedData: number[][];
}

interface StatsResult {
  rowId: string;
  groupMeans: Record<string, number>;
  testType: TestType;
  statistic: number;
  pValue: number;
  isSignificant: boolean;
}
```

## 디렉토리 구조

```
src/
├── components/
│   ├── DataInput.tsx
│   ├── OutlierPanel.tsx
│   ├── StatsPanel.tsx
│   ├── ResultPanel.tsx
│   └── visualization/
│       ├── BoxPlotChart.tsx
│       ├── OutlierTable.tsx
│       └── StatsResultTable.tsx
├── lib/
│   ├── outlier/
│   │   ├── index.ts
│   │   ├── zscore.ts
│   │   ├── iqr.ts
│   │   └── mad.ts
│   ├── statistics/
│   │   ├── index.ts
│   │   ├── ttest.ts
│   │   ├── anova.ts
│   │   └── levene.ts
│   └── utils/
│       ├── math.ts
│       └── parser.ts
├── types/
│   └── index.ts
├── App.tsx
└── main.tsx
```

## 컴포넌트 구조

```
App
├── Header
├── Navigation (Tabs)
└── Main
    ├── DataInput (tab: input)
    │   ├── DropZone
    │   ├── TextArea
    │   └── Preview
    ├── OutlierPanel (tab: outlier)
    │   ├── MethodSelector
    │   ├── ConfigPanel
    │   ├── BoxPlotChart
    │   └── OutlierTable
    ├── StatsPanel (tab: stats)
    │   ├── GroupConfig
    │   └── AnalysisConfig
    └── ResultPanel (tab: results)
        ├── SummaryCards
        └── StatsResultTable
```

## 유틸리티 함수

```typescript
// math.ts
mean(arr: number[]): number
std(arr: number[], ddof?: number): number
variance(arr: number[], ddof?: number): number
median(arr: number[]): number
percentile(arr: number[], p: number): number
mad(arr: number[]): number

// parser.ts
detectDelimiter(text: string): string
parseText(text: string, config?: ParseConfig): DataMatrix
parseCSVFile(file: File): Promise<DataMatrix>
```

## 테스트 데이터

```
10.5	11.2	10.8	9.9	10.3
11.0	10.5	11.3	10.2	10.8
9.8	10.1	10.9	11.5	10.3
10.2	10.0	9.5	10.4	10.1
100.0	10.3	10.7	10.5	10.2
10.1	-50.0	10.4	10.8	10.6
```

예상 이상치: (4,0)=100.0, (5,1)=-50.0

## Tailwind 클래스 패턴

```html
<!-- 버튼 -->
<button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
  
<!-- 카드 -->
<div class="bg-white rounded-lg border border-slate-200 p-4">

<!-- 입력 -->
<input class="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">

<!-- 테이블 -->
<table class="w-full text-sm">
  <thead class="bg-slate-50">
  <tbody>
    <tr class="border-t border-slate-100">
```

## 에러 처리 패턴

```typescript
try {
  const result = parseText(text);
  onLoad(result);
} catch (e) {
  setError(e instanceof Error ? e.message : 'Unknown error');
}
```

## 체크리스트

### 기능 구현
- [ ] Vite + React + TypeScript 설정
- [ ] Tailwind CSS 설정
- [ ] 타입 정의
- [ ] 수학 유틸리티
- [ ] 데이터 파서
- [ ] Z-Score 탐지
- [ ] IQR 탐지
- [ ] MAD 탐지
- [ ] T-test
- [ ] ANOVA
- [ ] Levene Test
- [ ] DataInput 컴포넌트
- [ ] OutlierPanel 컴포넌트
- [ ] StatsPanel 컴포넌트
- [ ] ResultPanel 컴포넌트
- [ ] 차트 컴포넌트
- [ ] CSV 내보내기
- [ ] 반응형 디자인

### ⚠️ 보안 체크 (필수)
- [ ] fetch/axios/XHR 사용 없음
- [ ] 외부 CDN 스크립트 없음
- [ ] Google Fonts 등 외부 폰트 없음
- [ ] localStorage/sessionStorage 사용 없음
- [ ] Analytics/트래킹 코드 없음
- [ ] 모든 라이브러리 번들에 포함
- [ ] 오프라인 실행 테스트 완료

## 🔒 보안 요약

```
┌────────────────────────────────────┐
│  LOCAL-ONLY PROCESSING             │
│                                    │
│  ✅ FileReader API                 │
│  ✅ Clipboard API                  │
│  ✅ Blob + download                │
│  ✅ React state                    │
│                                    │
│  ❌ fetch/axios/XHR                │
│  ❌ 외부 CDN/API                   │
│  ❌ localStorage/IndexedDB         │
│  ❌ 외부 폰트 (Google Fonts 등)    │
│  ❌ Analytics/트래킹               │
└────────────────────────────────────┘
```
