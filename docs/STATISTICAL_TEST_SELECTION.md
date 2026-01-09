# Statistical Test Selection Logic

이 문서는 통계 분석 시 테스트 방법이 자동으로 선택되는 로직을 설명합니다.

## 개요

본 시스템은 사용자가 테스트 방법을 수동으로 선택할 필요 없이, **데이터 특성에 따라 적절한 통계 테스트를 자동으로 선택**합니다.

## 자동 선택 흐름도

```
┌─────────────────────────────────────────────────────────────┐
│                    데이터 입력                               │
│                  (그룹별 데이터)                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
              ┌───────────────┐
              │  그룹 수 확인  │
              └───────┬───────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
   ┌─────────────┐         ┌─────────────┐
   │  2개 그룹   │         │ 3개 이상 그룹│
   └──────┬──────┘         └──────┬──────┘
          │                       │
          ▼                       │
   ┌─────────────┐                │
   │Levene's Test│                │
   │(등분산 검정)│                │
   └──────┬──────┘                │
          │                       │
    ┌─────┴─────┐                 │
    │           │                 │
    ▼           ▼                 ▼
┌────────┐ ┌──────────┐    ┌───────────┐
│p > α   │ │p ≤ α     │    │           │
│(등분산)│ │(이분산)  │    │  ANOVA    │
└───┬────┘ └────┬─────┘    └─────┬─────┘
    │           │                │
    ▼           ▼                │
┌────────┐ ┌──────────┐          │
│T-test  │ │Welch's   │          │
│(표준)  │ │T-test    │          │
└───┬────┘ └────┬─────┘          │
    │           │                │
    └─────┬─────┴────────────────┘
          │
          ▼
   ┌─────────────┐
   │  결과 출력   │
   └─────────────┘
```

## 선택 기준

### 1. 그룹 수에 따른 분기

| 그룹 수 | 선택되는 테스트 | 비고 |
|---------|-----------------|------|
| 2개 | T-test 또는 Welch's T-test | Levene's Test 결과에 따라 결정 |
| 3개 이상 | One-way ANOVA | 자동 선택 |

### 2. 등분산 검정 (2그룹일 때)

2개 그룹 비교 시, **Levene's Test**를 먼저 수행하여 분산의 동질성을 검정합니다.

| Levene's Test 결과 | 해석 | 선택되는 테스트 |
|-------------------|------|-----------------|
| p > α | 귀무가설 채택 (등분산 가정 유효) | Standard T-test |
| p ≤ α | 귀무가설 기각 (이분산) | Welch's T-test |

- **α (유의수준)**: 사용자가 설정 가능 (기본값: 0.05)

## 테스트별 상세 설명

### Standard T-test (등분산 T-test)

두 그룹의 분산이 동일하다고 가정할 때 사용합니다.

**수식:**
```
t = (x̄₁ - x̄₂) / √(s²pooled × (1/n₁ + 1/n₂))

s²pooled = ((n₁ - 1)×s₁² + (n₂ - 1)×s₂²) / (n₁ + n₂ - 2)

df = n₁ + n₂ - 2
```

**특징:**
- Pooled variance (합동 분산) 사용
- 자유도: n₁ + n₂ - 2

### Welch's T-test (이분산 T-test)

두 그룹의 분산이 다를 때 사용합니다.

**수식:**
```
t = (x̄₁ - x̄₂) / √(s₁²/n₁ + s₂²/n₂)

df = (s₁²/n₁ + s₂²/n₂)² / ((s₁²/n₁)²/(n₁-1) + (s₂²/n₂)²/(n₂-1))
```

**특징:**
- 각 그룹의 분산을 개별적으로 사용
- Welch-Satterthwaite 근사를 통한 자유도 계산
- 등분산 가정이 위배될 때 더 정확한 결과 제공

### Levene's Test (등분산 검정)

두 그룹의 분산이 동일한지 검정합니다.

**방법:**
1. 각 그룹에서 데이터와 그룹 평균의 절대 편차 계산: `zᵢⱼ = |xᵢⱼ - x̄ⱼ|`
2. 변환된 값들에 대해 T-test 수행
3. p-value 반환

**해석:**
- p > α: 등분산 가정 유효
- p ≤ α: 이분산 (분산이 유의하게 다름)

### One-way ANOVA

3개 이상의 그룹을 비교할 때 사용합니다.

**수식:**
```
F = MSBetween / MSWithin

MSBetween = SSBetween / (k - 1)
MSWithin = SSWithin / (N - k)

SSBetween = Σnⱼ(x̄ⱼ - x̄)²
SSWithin = ΣΣ(xᵢⱼ - x̄ⱼ)²
```

**특징:**
- F-분포 사용
- 자유도: dfBetween = k - 1, dfWithin = N - k
- k: 그룹 수, N: 전체 샘플 수

## 구현 코드 참조

### 핵심 선택 로직

**파일:** `src/lib/statistics/index.ts`

```typescript
if (numGroups === 2) {
  // 2그룹: Levene's Test로 등분산 확인 후 T-test 선택
  leveneP = levene(groups[0], groups[1]);
  equalVar = leveneP > config.alpha;
  const ttestResult = ttest(groups[0], groups[1], equalVar);
  testResult = ttestResult;
} else {
  // 3그룹 이상: ANOVA
  const anovaResult = anova(...groups);
  testResult = anovaResult;
}
```

### 관련 파일

| 파일 | 설명 |
|------|------|
| `src/lib/statistics/index.ts` | 테스트 선택 로직 (analyzeRows 함수) |
| `src/lib/statistics/ttest.ts` | T-test / Welch's T-test 구현 |
| `src/lib/statistics/levene.ts` | Levene's Test 구현 |
| `src/lib/statistics/anova.ts` | One-way ANOVA 구현 |

## 결과 데이터 구조

분석 결과에는 선택된 테스트 정보가 포함됩니다:

```typescript
interface StatsResult {
  rowId: string;              // 행 식별자
  groupMeans: Record<string, number>;  // 그룹별 평균
  testType: 'T-test' | 'Welch T-test' | 'ANOVA';  // 선택된 테스트
  statistic: number;          // 검정 통계량 (t 또는 F)
  pValue: number;             // p-value
  isSignificant: boolean;     // 유의성 여부 (p < α)
  leveneP: number;            // Levene 검정 p-value (2그룹일 때만)
  equalVariance: boolean;     // 등분산 여부
}
```

## 사용자 설정 가능 항목

| 설정 | 설명 | 기본값 |
|------|------|--------|
| α (alpha) | 유의수준 | 0.05 |
| minSamples | 최소 샘플 수 | 2 |

**참고:** 최소 샘플 수 미달 시 해당 행은 분석에서 제외되며, p-value는 1.0으로 설정됩니다.

## 행별 독립 분석

각 행(row)은 **독립적으로 분석**됩니다. 따라서:

- 같은 데이터셋 내에서도 행마다 다른 테스트가 선택될 수 있음
- 각 행의 `leveneP`, `equalVariance` 값이 개별적으로 계산됨
- 결과 테이블에서 각 행의 `testType`을 확인 가능

## 예시

### 2그룹 비교 예시

```
Group A: [10.5, 11.2, 10.8, 9.9, 10.3]
Group B: [12.1, 11.8, 12.5, 11.9, 12.0]

1. Levene's Test 수행 → p = 0.72
2. p (0.72) > α (0.05) → 등분산
3. Standard T-test 선택
4. 결과: testType = 'T-test'
```

### 3그룹 비교 예시

```
Group A: [10.5, 11.2, 10.8]
Group B: [12.1, 11.8, 12.5]
Group C: [15.0, 14.5, 15.2]

1. 그룹 수 = 3 → ANOVA 자동 선택
2. 결과: testType = 'ANOVA'
```
