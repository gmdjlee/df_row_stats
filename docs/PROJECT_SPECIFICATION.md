# Statistical Analysis SPA - Project Specification

## 프로젝트 개요

### 목적
Python 기반의 이상치 탐지(Outlier Detection) 및 행별 통계 분석(Row Statistics Analysis) 기능을 웹 기반 Single Page Application으로 구현하여, 데이터 분석가가 브라우저에서 직접 데이터를 분석할 수 있도록 합니다.

### ⚠️ 보안 요구사항 (필수)

| 항목 | 요구사항 |
|------|----------|
| **데이터 처리** | 100% 클라이언트 사이드 (브라우저 내) |
| **네트워크** | 모든 외부 통신 금지 |
| **저장소** | localStorage/IndexedDB 사용 금지 |
| **외부 리소스** | CDN, 외부 폰트, API 호출 금지 |
| **실행 환경** | 오프라인 실행 가능해야 함 |

```
┌──────────────────────────────────────────────────────────┐
│                    LOCAL-ONLY ARCHITECTURE               │
│                                                          │
│   [User] ──── File/Paste ────▶ [Browser]                │
│                                    │                     │
│                              ┌─────▼─────┐               │
│                              │  React    │               │
│                              │   App     │               │
│                              │ (Bundled) │               │
│                              └─────┬─────┘               │
│                                    │                     │
│                              ┌─────▼─────┐               │
│                              │  Analysis │               │
│                              │  Engine   │               │
│                              │ (In-Memory)│              │
│                              └─────┬─────┘               │
│                                    │                     │
│   [User] ◀──── Download ─────────┘                      │
│                                                          │
│   ❌ NO: fetch, API, CDN, Analytics, Storage            │
└──────────────────────────────────────────────────────────┘
```

### 데이터 규모
- **예상 크기**: 소규모 (최대 1,000행 × 100열)
- **메모리**: 브라우저 기본 메모리로 충분
- **Web Worker**: 불필요 (소규모 데이터)

### 핵심 기능
1. **데이터 입력**: Copy & Paste 또는 CSV/TXT 파일 Drag & Drop
2. **이상치 탐지**: Z-Score, IQR, Modified Z-Score(MAD), Grubbs, Winsorize
3. **통계 분석**: T-test, Welch T-test, ANOVA
4. **시각화**: 입력 데이터, 이상치, 분석 결과 시각화
5. **결과 내보내기**: CSV/JSON 다운로드

---

## 기술 스택

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 3.4
- **UI Components**: shadcn/ui
- **Charts**: Recharts / D3.js
- **State Management**: React Context + useReducer
- **File Handling**: react-dropzone

### Design Philosophy
- 클린하고 전문적인 대시보드 스타일
- 데이터 시각화에 집중
- 반응형 디자인
- 접근성 고려 (WCAG 2.1)

---

## 아키텍처

### 디렉토리 구조
```
statistical-analysis-spa/
├── src/
│   ├── components/           # UI 컴포넌트
│   │   ├── common/           # 공통 컴포넌트
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Select.tsx
│   │   │   └── Tabs.tsx
│   │   ├── data/             # 데이터 입력 컴포넌트
│   │   │   ├── DataInput.tsx
│   │   │   ├── FileDropzone.tsx
│   │   │   └── DataPreview.tsx
│   │   ├── outlier/          # 이상치 분석 컴포넌트
│   │   │   ├── OutlierPanel.tsx
│   │   │   ├── MethodSelector.tsx
│   │   │   └── OutlierResult.tsx
│   │   ├── statistics/       # 통계 분석 컴포넌트
│   │   │   ├── StatsPanel.tsx
│   │   │   ├── GroupConfig.tsx
│   │   │   └── StatsResult.tsx
│   │   └── visualization/    # 시각화 컴포넌트
│   │       ├── DataChart.tsx
│   │       ├── BoxPlot.tsx
│   │       ├── DistributionChart.tsx
│   │       └── ResultTable.tsx
│   ├── hooks/                # 커스텀 훅
│   │   ├── useData.ts
│   │   ├── useOutlier.ts
│   │   └── useStats.ts
│   ├── lib/                  # 핵심 로직
│   │   ├── outlier/          # 이상치 탐지 알고리즘
│   │   │   ├── index.ts
│   │   │   ├── zscore.ts
│   │   │   ├── iqr.ts
│   │   │   ├── mad.ts
│   │   │   ├── grubbs.ts
│   │   │   └── winsorize.ts
│   │   ├── statistics/       # 통계 분석 알고리즘
│   │   │   ├── index.ts
│   │   │   ├── ttest.ts
│   │   │   ├── anova.ts
│   │   │   └── levene.ts
│   │   └── utils/            # 유틸리티
│   │       ├── parser.ts     # 데이터 파싱
│   │       ├── export.ts     # 결과 내보내기
│   │       └── math.ts       # 수학 함수
│   ├── types/                # TypeScript 타입
│   │   ├── data.ts
│   │   ├── outlier.ts
│   │   └── statistics.ts
│   ├── context/              # React Context
│   │   └── AppContext.tsx
│   ├── App.tsx
│   └── main.tsx
├── public/
├── docs/
│   ├── PROJECT_SPECIFICATION.md
│   └── API_REFERENCE.md
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── index.html
```

---

## 상세 기능 명세

### 1. 데이터 입력 모듈

#### 1.1 Copy & Paste
```typescript
interface PasteConfig {
  delimiter: 'auto' | 'tab' | 'comma' | 'space';
  hasHeader: boolean;
  hasRowIndex: boolean;
}
```

**지원 형식**:
- TSV (탭 구분)
- CSV (쉼표 구분)
- 공백 구분 데이터

#### 1.2 File Drag & Drop
```typescript
interface FileConfig {
  accept: ['.csv', '.txt', '.tsv'];
  maxSize: 10 * 1024 * 1024; // 10MB
  encoding: 'utf-8' | 'auto';
}
```

#### 1.3 데이터 미리보기
- 처음 10행 표시
- 컬럼 타입 자동 감지
- 결측치 하이라이트

---

### 2. 이상치 탐지 모듈

#### 2.1 탐지 메서드

| 메서드 | 파라미터 | 설명 |
|--------|----------|------|
| Z-Score | threshold (default: 3.0) | 표준편차 기반 탐지 |
| IQR | multiplier (default: 1.5) | 사분위수 기반 탐지 |
| Modified Z-Score | threshold (default: 3.5) | MAD 기반 탐지 |
| Grubbs | alpha (default: 0.05) | 통계적 유의성 기반 |
| Winsorize | limits (default: [0.05, 0.05]) | 백분위수 클리핑 |

#### 2.2 이상치 처리 옵션
```typescript
enum OutlierAction {
  REMOVE = 'remove',
  REPLACE_NAN = 'replace_nan',
  REPLACE_MEAN = 'replace_mean',
  REPLACE_MEDIAN = 'replace_median',
  WINSORIZE = 'winsorize',
  FLAG_ONLY = 'flag_only'
}
```

#### 2.3 결과 출력
```typescript
interface OutlierResult {
  method: string;
  outlierCount: number;
  outlierRatio: number;
  outlierIndices: number[];
  bounds: { lower: number; upper: number };
  statistics: Record<string, number>;
  cleanedData: number[][];
}
```

---

### 3. 통계 분석 모듈

#### 3.1 지원 테스트
- **2그룹**: Independent T-test, Welch's T-test (자동 선택)
- **3그룹 이상**: One-way ANOVA

#### 3.2 등분산 검정
- Levene's Test 자동 수행
- p > alpha: 등분산 가정 충족 → T-test
- p ≤ alpha: 등분산 가정 불충족 → Welch's T-test

#### 3.3 결과 출력
```typescript
interface StatsResult {
  rowId: string;
  groupMeans: Record<string, number>;
  testType: 'T-test' | 'Welch T-test' | 'ANOVA';
  statistic: number;
  pValue: number;
  isSignificant: boolean;
  leveneP: number;
  equalVariance: boolean;
}
```

---

### 4. 시각화 모듈

#### 4.1 입력 데이터 시각화
- **Heatmap**: 전체 데이터 매트릭스
- **Distribution**: 컬럼별 히스토그램
- **Summary Stats**: 기본 통계량 테이블

#### 4.2 이상치 시각화
- **Box Plot**: 이상치 위치 표시
- **Scatter Plot**: 이상치 하이라이트
- **Before/After**: 처리 전후 비교

#### 4.3 분석 결과 시각화
- **P-value Distribution**: 히스토그램
- **Significance Bar**: 유의/비유의 비율
- **Effect Size**: 효과 크기 시각화

---

## 구현 단계

### Phase 1: 프로젝트 설정 (Day 1)
1. Vite + React + TypeScript 초기화
2. Tailwind CSS 설정
3. shadcn/ui 컴포넌트 설치
4. 디렉토리 구조 생성

### Phase 2: 데이터 입력 모듈 (Day 1-2)
1. 텍스트 영역 컴포넌트
2. Drag & Drop 영역
3. 데이터 파서 구현
4. 미리보기 테이블

### Phase 3: 이상치 탐지 모듈 (Day 2-3)
1. 탐지 알고리즘 구현 (JS/TS)
2. 메서드 선택 UI
3. 파라미터 설정 UI
4. 결과 테이블

### Phase 4: 통계 분석 모듈 (Day 3-4)
1. 통계 알고리즘 구현
2. 그룹 설정 UI
3. 분석 실행 로직
4. 결과 테이블

### Phase 5: 시각화 (Day 4-5)
1. Recharts/D3 통합
2. 차트 컴포넌트 구현
3. 인터랙티브 기능

### Phase 6: 마무리 (Day 5)
1. 결과 내보내기
2. 반응형 디자인
3. 에러 핸들링
4. 테스트 및 버그 수정

---

## 코딩 컨벤션

### 네이밍
- **컴포넌트**: PascalCase (`DataInput.tsx`)
- **함수**: camelCase (`parseData`)
- **상수**: UPPER_SNAKE_CASE (`DEFAULT_THRESHOLD`)
- **타입**: PascalCase (`OutlierResult`)

### 함수 길이
- 단일 함수: 30줄 이하
- 복잡한 로직: 헬퍼 함수로 분리

### 주석
- JSDoc 스타일 사용
- 복잡한 알고리즘에 설명 추가

### 테스트
- 핵심 알고리즘 단위 테스트
- 컴포넌트 스냅샷 테스트

---

## 성능 최적화

1. **데이터 처리**: 동기 처리 (소규모 데이터, Web Worker 불필요)
2. **렌더링**: React.memo, useMemo 활용
3. **번들**: Tree shaking, 모든 라이브러리 인라인
4. **메모리**: 분석 완료 후 state 초기화로 메모리 해제

---

## 보안 가이드라인

### 금지된 코드 패턴
```typescript
// ❌ 절대 사용 금지
fetch('https://...');
axios.get('...');
new XMLHttpRequest();
localStorage.setItem();
sessionStorage.setItem();
navigator.sendBeacon();

// ❌ 외부 리소스 로드 금지
<script src="https://cdn.example.com/...">
<link href="https://fonts.googleapis.com/...">
```

### 허용된 코드 패턴
```typescript
// ✅ 로컬 파일 읽기
const reader = new FileReader();
reader.readAsText(file);

// ✅ 클립보드 읽기
navigator.clipboard.readText();

// ✅ 결과 다운로드
const blob = new Blob([csvContent], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
// ... download and revoke

// ✅ React state로 데이터 관리
const [data, setData] = useState<number[][] | null>(null);
```

### 폰트 처리
```css
/* ✅ 시스템 폰트 사용 (외부 로드 없음) */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
             Roboto, Oxygen, Ubuntu, sans-serif;

/* ❌ Google Fonts 사용 금지 */
/* @import url('https://fonts.googleapis.com/...'); */
```

---

## 접근성

- ARIA 레이블
- 키보드 네비게이션
- 색맹 친화적 팔레트
- 스크린 리더 호환

---

## 향후 확장 계획

1. **서버 연동**: REST API 백엔드
2. **추가 분석**: 상관분석, 회귀분석
3. **협업**: 실시간 공유 기능
4. **템플릿**: 분석 템플릿 저장/로드
