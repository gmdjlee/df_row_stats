# CLAUDE.md - Statistical Analysis SPA

## 프로젝트 개요

이 프로젝트는 이상치 탐지(Outlier Detection)와 행별 통계 분석(Row Statistics Analysis)을 수행하는 웹 기반 Single Page Application입니다.

## ⚠️ 핵심 보안 요구사항

```
┌─────────────────────────────────────────────────────────────┐
│  🔒 DATA SECURITY: LOCAL-ONLY PROCESSING                    │
│                                                             │
│  • 모든 데이터는 브라우저 내에서만 처리                      │
│  • 네트워크 요청 절대 금지 (fetch, XMLHttpRequest 사용 불가)│
│  • 외부 CDN, API 호출 금지                                  │
│  • 모든 라이브러리는 번들에 포함 (오프라인 실행 가능)       │
│  • localStorage/sessionStorage 사용 금지 (데이터 잔류 방지)│
│  • 분석 완료 후 메모리에서 데이터 자동 해제                 │
└─────────────────────────────────────────────────────────────┘
```

### 금지 사항
- ❌ `fetch()`, `axios`, `XMLHttpRequest` 사용
- ❌ 외부 CDN 스크립트 로드 (`<script src="https://...">`)
- ❌ Google Fonts 등 외부 리소스 참조
- ❌ Analytics, 트래킹 코드
- ❌ WebSocket 연결
- ❌ localStorage, sessionStorage, IndexedDB 저장

### 허용 사항
- ✅ 로컬 파일 읽기 (FileReader API)
- ✅ 클립보드 붙여넣기 (Clipboard API)
- ✅ 번들된 라이브러리 사용
- ✅ 결과 파일 다운로드 (Blob + download)
- ✅ React state를 통한 임시 데이터 관리

## 빠른 시작

```bash
# 프로젝트 초기화
npm create vite@latest . -- --template react-ts
npm install

# 의존성 설치
npm install recharts jstat lodash
npm install -D tailwindcss postcss autoprefixer @types/lodash

# 실행
npm run dev
```

## 핵심 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 시작 |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 미리보기 |
| `npm run lint` | 린트 검사 |

## 아키텍처 가이드

### 디렉토리 구조
```
src/
├── components/     # React 컴포넌트
├── hooks/          # 커스텀 훅
├── lib/            # 핵심 비즈니스 로직
├── types/          # TypeScript 타입 정의
└── context/        # React Context
```

### 핵심 모듈

#### 1. 데이터 파서 (`lib/utils/parser.ts`)
- `parseText(text, config)`: 텍스트 → 2D 배열
- `parseCSV(file)`: CSV 파일 → 2D 배열
- `detectDelimiter(text)`: 구분자 자동 감지

#### 2. 이상치 탐지 (`lib/outlier/`)
- `detectZScore(data, threshold)`: Z-Score 탐지
- `detectIQR(data, multiplier)`: IQR 탐지
- `detectMAD(data, threshold)`: Modified Z-Score
- `detectGrubbs(data, alpha)`: Grubbs' Test
- `winsorize(data, limits)`: Winsorizing

#### 3. 통계 분석 (`lib/statistics/`)
- `ttest(group1, group2, equalVar)`: T-test
- `welchTtest(group1, group2)`: Welch T-test
- `anova(...groups)`: One-way ANOVA
- `levene(...groups)`: Levene's Test

## 코딩 규칙

### 네이밍 컨벤션
```typescript
// 컴포넌트: PascalCase
export function DataInput() { }

// 함수: camelCase
function parseData() { }

// 상수: UPPER_SNAKE_CASE
const DEFAULT_THRESHOLD = 3.0;

// 타입/인터페이스: PascalCase
interface OutlierResult { }
```

### 함수 작성 규칙
```typescript
/**
 * 이상치 탐지 함수
 * @param data - 입력 데이터 배열
 * @param threshold - 탐지 임계값
 * @returns 탐지 결과 객체
 */
function detectOutliers(data: number[], threshold: number): OutlierResult {
  // 함수 본문은 30줄 이하로 유지
  // 복잡한 로직은 헬퍼 함수로 분리
}
```

### 컴포넌트 작성 규칙
```typescript
interface Props {
  data: number[][];
  onAnalyze: (result: Result) => void;
}

export function AnalysisPanel({ data, onAnalyze }: Props) {
  // 1. 상태 정의
  const [config, setConfig] = useState(defaultConfig);
  
  // 2. 파생 상태
  const isValid = useMemo(() => validate(data), [data]);
  
  // 3. 이벤트 핸들러
  const handleSubmit = useCallback(() => {
    const result = analyze(data, config);
    onAnalyze(result);
  }, [data, config, onAnalyze]);
  
  // 4. 렌더링
  return ( /* JSX */ );
}
```

## 주요 타입 정의

```typescript
// 데이터 타입
interface DataMatrix {
  data: number[][];
  headers?: string[];
  rowIds?: string[];
}

// 이상치 탐지 설정
interface OutlierConfig {
  method: 'zscore' | 'iqr' | 'mad' | 'grubbs' | 'winsorize';
  threshold?: number;
  multiplier?: number;
  alpha?: number;
  limits?: [number, number];
}

// 이상치 탐지 결과
interface OutlierResult {
  method: string;
  outlierCount: number;
  outlierRatio: number;
  outlierMask: boolean[][];
  bounds: { lower: number; upper: number };
  cleanedData: number[][];
}

// 통계 분석 결과
interface StatsResult {
  rowId: string;
  groupMeans: Record<string, number>;
  testType: string;
  statistic: number;
  pValue: number;
  isSignificant: boolean;
}
```

## 구현 우선순위

### Phase 1: 기본 구조 (필수)
1. [ ] 프로젝트 초기화 및 설정
2. [ ] 타입 정의
3. [ ] 데이터 파서 구현

### Phase 2: 이상치 탐지 (핵심)
1. [ ] Z-Score 알고리즘
2. [ ] IQR 알고리즘
3. [ ] Modified Z-Score (MAD)
4. [ ] 탐지 UI 컴포넌트

### Phase 3: 통계 분석 (핵심)
1. [ ] T-test 구현
2. [ ] ANOVA 구현
3. [ ] Levene's Test
4. [ ] 분석 UI 컴포넌트

### Phase 4: 시각화 (중요)
1. [ ] Box Plot
2. [ ] Distribution Chart
3. [ ] Result Table

### Phase 5: 마무리 (선택)
1. [ ] 결과 내보내기
2. [ ] 에러 핸들링
3. [ ] 성능 최적화

## 알고리즘 참조

### Z-Score
```typescript
// Z = (x - μ) / σ
// |Z| > threshold → outlier
function zScore(x: number, mean: number, std: number): number {
  return (x - mean) / std;
}
```

### IQR
```typescript
// lower = Q1 - k * IQR
// upper = Q3 + k * IQR
// x < lower || x > upper → outlier
function iqrBounds(q1: number, q3: number, k: number) {
  const iqr = q3 - q1;
  return { lower: q1 - k * iqr, upper: q3 + k * iqr };
}
```

### Modified Z-Score (MAD)
```typescript
// M = 0.6745 * (x - median) / MAD
// |M| > threshold → outlier
function modifiedZScore(x: number, median: number, mad: number): number {
  return 0.6745 * (x - median) / mad;
}
```

### T-test (Independent)
```typescript
// t = (x̄₁ - x̄₂) / √(s²pooled * (1/n₁ + 1/n₂))
// df = n₁ + n₂ - 2
```

### Welch's T-test
```typescript
// t = (x̄₁ - x̄₂) / √(s₁²/n₁ + s₂²/n₂)
// df = Welch-Satterthwaite approximation
```

## 테스트 데이터

### 샘플 입력 (Copy & Paste용)
```
10.5	11.2	10.8	9.9	100.0
11.0	10.5	11.3	10.2	10.8
9.8	10.1	10.9	11.5	10.3
-50.0	10.0	9.5	10.4	10.1
10.2	10.8	11.0	10.6	10.9
```

### 예상 결과
- 이상치: (0,4)=100.0, (3,0)=-50.0
- IQR method로 탐지 가능

## 주의사항

1. **로컬 전용 처리**: 모든 데이터는 브라우저 내에서만 처리 (네트워크 전송 금지)
2. **NaN 처리**: 모든 계산에서 NaN 제외 후 처리
3. **정밀도**: `toFixed(4)` 또는 유효숫자 4자리 표시
4. **에러**: 사용자 친화적 에러 메시지 표시
5. **메모리**: 분석 완료 후 state 초기화로 메모리 해제

## ⚠️ 보안 체크리스트

```
[ ] fetch, axios, XMLHttpRequest 사용하지 않음
[ ] 외부 CDN 스크립트 로드하지 않음
[ ] Google Fonts 등 외부 폰트 사용하지 않음
[ ] localStorage/sessionStorage 사용하지 않음
[ ] Analytics/트래킹 코드 없음
[ ] 모든 라이브러리가 번들에 포함됨
[ ] 오프라인에서 실행 가능함
```

## 참고 문서

- [PROJECT_SPECIFICATION.md](docs/PROJECT_SPECIFICATION.md) - 상세 명세서
- [Recharts 문서](https://recharts.org/en-US/api)
- [jstat 문서](https://jstat.github.io/all.html)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
