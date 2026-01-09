import { useState } from 'react';

type Section = 'outlier' | 'stats';

export function ExplanationPanel() {
  const [section, setSection] = useState<Section>('outlier');

  return (
    <div className="space-y-6">
      {/* Section Toggle */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setSection('outlier')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              section === 'outlier'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Outlier Detection Guide
          </button>
          <button
            onClick={() => setSection('stats')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              section === 'stats'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Statistical Test Selection
          </button>
        </div>
      </div>

      {section === 'outlier' && <OutlierGuide />}
      {section === 'stats' && <StatsGuide />}
    </div>
  );
}

function OutlierGuide() {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Outlier Detection Method Selection Guide
        </h2>
        <p className="text-slate-600 mb-4">
          이상치 탐지 방법은 데이터의 분포와 특성에 따라 적절한 방법을 선택해야 합니다.
          아래 가이드를 참고하여 데이터에 맞는 방법을 선택하세요.
        </p>

        {/* Selection Flowchart */}
        <div className="bg-slate-50 rounded-lg p-4 font-mono text-sm overflow-x-auto">
          <pre className="text-slate-700">{`
┌─────────────────────────────────────────────────────────────┐
│                    데이터 특성 확인                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
              ┌───────┴───────┐
              │  정규 분포?    │
              └───────┬───────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
   ┌─────────────┐         ┌─────────────┐
   │   예 (Yes)  │         │  아니오 (No)│
   └──────┬──────┘         └──────┬──────┘
          │                       │
          ▼                       ▼
   ┌─────────────┐         ┌─────────────┐
   │   Z-Score   │         │  극단값 多? │
   │ (threshold  │         └──────┬──────┘
   │   = 3.0)    │                │
   └─────────────┘        ┌───────┴───────┐
                          │               │
                          ▼               ▼
                   ┌─────────────┐ ┌─────────────┐
                   │   예 (Yes)  │ │  아니오 (No)│
                   └──────┬──────┘ └──────┬──────┘
                          │               │
                          ▼               ▼
                   ┌─────────────┐ ┌─────────────┐
                   │ Modified    │ │    IQR      │
                   │ Z-Score     │ │ (k = 1.5)   │
                   │ (MAD)       │ └─────────────┘
                   └─────────────┘
`}</pre>
        </div>
      </div>

      {/* Method Comparison Table */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Method Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Method</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Best For</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Robustness</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Sensitivity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-3 font-medium">Z-Score</td>
                <td className="px-4 py-3 text-slate-600">Normal distribution</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Low</span>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">High</span>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">IQR</td>
                <td className="px-4 py-3 text-slate-600">Skewed distribution</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">High</span>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Medium</span>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Modified Z-Score (MAD)</td>
                <td className="px-4 py-3 text-slate-600">Heavy outliers</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Very High</span>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Medium</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Z-Score Method */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Z-Score Method</h3>
        <p className="text-slate-600 mb-4">
          데이터가 평균에서 몇 표준편차 떨어져 있는지를 측정합니다.
        </p>

        <div className="bg-slate-50 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-slate-800 mb-2">Formula</h4>
          <div className="font-mono text-sm">
            <p>Z = (x - μ) / σ</p>
            <p className="mt-2 text-slate-600">|Z| &gt; threshold → Outlier</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-green-700 mb-2">Advantages</h4>
            <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
              <li>Simple and widely understood</li>
              <li>Works well for normal distributions</li>
              <li>Easy to interpret</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-red-700 mb-2">Limitations</h4>
            <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
              <li>Sensitive to extreme outliers</li>
              <li>Assumes normal distribution</li>
              <li>Mean/std affected by outliers</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <span className="text-sm font-medium text-blue-800">Recommended threshold:</span>
          <span className="text-sm text-blue-700 ml-2">2.5 ~ 3.0 (default: 3.0)</span>
        </div>
      </div>

      {/* IQR Method */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">IQR (Interquartile Range) Method</h3>
        <p className="text-slate-600 mb-4">
          사분위수 범위를 기반으로 이상치를 탐지합니다. 분포의 중앙 50%를 기준으로 합니다.
        </p>

        <div className="bg-slate-50 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-slate-800 mb-2">Formula</h4>
          <div className="font-mono text-sm">
            <p>IQR = Q3 - Q1</p>
            <p>Lower bound = Q1 - k × IQR</p>
            <p>Upper bound = Q3 + k × IQR</p>
            <p className="mt-2 text-slate-600">x &lt; Lower OR x &gt; Upper → Outlier</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-green-700 mb-2">Advantages</h4>
            <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
              <li>Robust to extreme values</li>
              <li>No distribution assumption</li>
              <li>Works well for skewed data</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-red-700 mb-2">Limitations</h4>
            <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
              <li>May miss mild outliers</li>
              <li>Less sensitive than Z-Score</li>
              <li>Requires sufficient data</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <span className="text-sm font-medium text-blue-800">Recommended multiplier (k):</span>
          <span className="text-sm text-blue-700 ml-2">1.5 (mild) ~ 3.0 (extreme)</span>
        </div>
      </div>

      {/* MAD Method */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Modified Z-Score (MAD) Method</h3>
        <p className="text-slate-600 mb-4">
          중앙값과 MAD(Median Absolute Deviation)를 사용하여 이상치에 강건한 탐지를 수행합니다.
        </p>

        <div className="bg-slate-50 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-slate-800 mb-2">Formula</h4>
          <div className="font-mono text-sm">
            <p>MAD = median(|xᵢ - median(x)|)</p>
            <p>M = 0.6745 × (x - median) / MAD</p>
            <p className="mt-2 text-slate-600">|M| &gt; threshold → Outlier</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-green-700 mb-2">Advantages</h4>
            <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
              <li>Most robust to outliers</li>
              <li>Uses median-based statistics</li>
              <li>Good for heavy-tailed data</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-red-700 mb-2">Limitations</h4>
            <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
              <li>Can fail when MAD = 0</li>
              <li>More complex to interpret</li>
              <li>May be too conservative</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <span className="text-sm font-medium text-blue-800">Recommended threshold:</span>
          <span className="text-sm text-blue-700 ml-2">3.0 ~ 3.5 (default: 3.5)</span>
        </div>
      </div>

      {/* Quick Reference */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Selection Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl mb-2">📊</div>
            <h4 className="font-medium text-slate-900">Normal Data</h4>
            <p className="text-sm text-slate-600 mt-1">Use <strong>Z-Score</strong></p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl mb-2">📈</div>
            <h4 className="font-medium text-slate-900">Skewed Data</h4>
            <p className="text-sm text-slate-600 mt-1">Use <strong>IQR</strong></p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl mb-2">🎯</div>
            <h4 className="font-medium text-slate-900">Many Outliers</h4>
            <p className="text-sm text-slate-600 mt-1">Use <strong>MAD</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsGuide() {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Statistical Test Selection Logic
        </h2>
        <p className="text-slate-600 mb-4">
          본 시스템은 사용자가 테스트 방법을 수동으로 선택할 필요 없이,
          <strong> 데이터 특성에 따라 적절한 통계 테스트를 자동으로 선택</strong>합니다.
        </p>

        {/* Selection Flowchart */}
        <div className="bg-slate-50 rounded-lg p-4 font-mono text-sm overflow-x-auto">
          <pre className="text-slate-700">{`
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
`}</pre>
        </div>
      </div>

      {/* Selection Criteria */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Selection Criteria</h3>

        <h4 className="font-medium text-slate-800 mb-2">1. By Number of Groups</h4>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Groups</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Selected Test</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-3 font-medium">2 groups</td>
                <td className="px-4 py-3">T-test or Welch's T-test</td>
                <td className="px-4 py-3 text-slate-600">Determined by Levene's Test</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">3+ groups</td>
                <td className="px-4 py-3">One-way ANOVA</td>
                <td className="px-4 py-3 text-slate-600">Auto-selected</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 className="font-medium text-slate-800 mb-2">2. Variance Test (2 Groups)</h4>
        <p className="text-slate-600 mb-3">
          When comparing 2 groups, <strong>Levene's Test</strong> is performed first to test homogeneity of variances.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Levene's Result</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Interpretation</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Selected Test</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-3 font-mono">p &gt; α</td>
                <td className="px-4 py-3 text-slate-600">Equal variance assumed</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                    Standard T-test
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono">p ≤ α</td>
                <td className="px-4 py-3 text-slate-600">Unequal variance</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    Welch's T-test
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-slate-500 mt-2">
          <strong>α (significance level):</strong> User configurable (default: 0.05)
        </p>
      </div>

      {/* Standard T-test */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Standard T-test</h3>
        <p className="text-slate-600 mb-4">
          Used when variances of two groups are assumed equal.
        </p>

        <div className="bg-slate-50 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-slate-800 mb-2">Formula</h4>
          <div className="font-mono text-sm space-y-2">
            <p>t = (x̄₁ - x̄₂) / √(s²pooled × (1/n₁ + 1/n₂))</p>
            <p>s²pooled = ((n₁ - 1)×s₁² + (n₂ - 1)×s₂²) / (n₁ + n₂ - 2)</p>
            <p>df = n₁ + n₂ - 2</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-green-50 rounded-lg p-3">
            <span className="font-medium text-green-800">Uses:</span>
            <span className="text-green-700 ml-1">Pooled variance</span>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <span className="font-medium text-blue-800">df:</span>
            <span className="text-blue-700 ml-1">n₁ + n₂ - 2</span>
          </div>
        </div>
      </div>

      {/* Welch's T-test */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Welch's T-test</h3>
        <p className="text-slate-600 mb-4">
          Used when variances of two groups are different.
        </p>

        <div className="bg-slate-50 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-slate-800 mb-2">Formula</h4>
          <div className="font-mono text-sm space-y-2">
            <p>t = (x̄₁ - x̄₂) / √(s₁²/n₁ + s₂²/n₂)</p>
            <p>df = (s₁²/n₁ + s₂²/n₂)² / ((s₁²/n₁)²/(n₁-1) + (s₂²/n₂)²/(n₂-1))</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-green-50 rounded-lg p-3">
            <span className="font-medium text-green-800">Uses:</span>
            <span className="text-green-700 ml-1">Separate variances</span>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <span className="font-medium text-blue-800">df:</span>
            <span className="text-blue-700 ml-1">Welch-Satterthwaite approximation</span>
          </div>
        </div>
      </div>

      {/* Levene's Test */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Levene's Test</h3>
        <p className="text-slate-600 mb-4">
          Tests whether the variances of two groups are equal.
        </p>

        <div className="bg-slate-50 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-slate-800 mb-2">Method</h4>
          <ol className="text-sm text-slate-700 space-y-1 list-decimal list-inside">
            <li>Calculate absolute deviation from group mean: zᵢⱼ = |xᵢⱼ - x̄ⱼ|</li>
            <li>Perform T-test on transformed values</li>
            <li>Return p-value</li>
          </ol>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-green-50 rounded-lg p-3">
            <span className="font-medium text-green-800">p &gt; α:</span>
            <span className="text-green-700 ml-1">Equal variance valid</span>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <span className="font-medium text-red-800">p ≤ α:</span>
            <span className="text-red-700 ml-1">Unequal variance</span>
          </div>
        </div>
      </div>

      {/* One-way ANOVA */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">One-way ANOVA</h3>
        <p className="text-slate-600 mb-4">
          Used when comparing 3 or more groups.
        </p>

        <div className="bg-slate-50 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-slate-800 mb-2">Formula</h4>
          <div className="font-mono text-sm space-y-2">
            <p>F = MSBetween / MSWithin</p>
            <p>MSBetween = SSBetween / (k - 1)</p>
            <p>MSWithin = SSWithin / (N - k)</p>
            <p>SSBetween = Σnⱼ(x̄ⱼ - x̄)²</p>
            <p>SSWithin = ΣΣ(xᵢⱼ - x̄ⱼ)²</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-blue-50 rounded-lg p-3">
            <span className="font-medium text-blue-800">Distribution:</span>
            <span className="text-blue-700 ml-1">F</span>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <span className="font-medium text-green-800">df₁:</span>
            <span className="text-green-700 ml-1">k - 1</span>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <span className="font-medium text-purple-800">df₂:</span>
            <span className="text-purple-700 ml-1">N - k</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          k = number of groups, N = total sample size
        </p>
      </div>

      {/* Result Structure */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Result Data Structure</h3>
        <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-slate-100 overflow-x-auto">
          <pre>{`interface StatsResult {
  rowId: string;              // Row identifier
  groupMeans: Record<string, number>;  // Mean by group
  testType: 'T-test' | 'Welch T-test' | 'ANOVA';
  statistic: number;          // t or F statistic
  pValue: number;             // p-value
  isSignificant: boolean;     // p < α
  leveneP: number;            // Levene p-value (2 groups only)
  equalVariance: boolean;     // Equal variance flag
}`}</pre>
        </div>
      </div>

      {/* Independent Row Analysis */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Row-by-Row Independent Analysis</h3>
        <p className="text-slate-700 mb-4">
          Each row is analyzed <strong>independently</strong>. Therefore:
        </p>
        <ul className="text-sm text-slate-700 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-amber-600 font-bold">•</span>
            Different tests may be selected for different rows in the same dataset
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-600 font-bold">•</span>
            leveneP and equalVariance are calculated individually for each row
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-600 font-bold">•</span>
            Check testType in the results table to see which test was used for each row
          </li>
        </ul>
      </div>

      {/* Examples */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Examples</h3>

        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="font-medium text-slate-800 mb-2">2-Group Comparison</h4>
            <div className="font-mono text-sm text-slate-600 space-y-1">
              <p>Group A: [10.5, 11.2, 10.8, 9.9, 10.3]</p>
              <p>Group B: [12.1, 11.8, 12.5, 11.9, 12.0]</p>
              <p className="mt-2">1. Levene's Test → p = 0.72</p>
              <p>2. p (0.72) &gt; α (0.05) → Equal variance</p>
              <p>3. Standard T-test selected</p>
              <p className="text-green-600 font-medium">Result: testType = 'T-test'</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="font-medium text-slate-800 mb-2">3-Group Comparison</h4>
            <div className="font-mono text-sm text-slate-600 space-y-1">
              <p>Group A: [10.5, 11.2, 10.8]</p>
              <p>Group B: [12.1, 11.8, 12.5]</p>
              <p>Group C: [15.0, 14.5, 15.2]</p>
              <p className="mt-2">1. Groups = 3 → ANOVA auto-selected</p>
              <p className="text-green-600 font-medium">Result: testType = 'ANOVA'</p>
            </div>
          </div>
        </div>
      </div>

      {/* User Settings */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">User Configurable Settings</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Setting</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Description</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Default</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-3 font-mono">α (alpha)</td>
                <td className="px-4 py-3 text-slate-600">Significance level</td>
                <td className="px-4 py-3">0.05</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono">minSamples</td>
                <td className="px-4 py-3 text-slate-600">Minimum sample size</td>
                <td className="px-4 py-3">2</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-slate-500 mt-3">
          <strong>Note:</strong> If minimum sample size is not met, the row is excluded from analysis and p-value is set to 1.0.
        </p>
      </div>
    </div>
  );
}
