import { useState, useMemo } from 'react';
import { DataMatrix, StatsResult, StatsConfig, NormalizeMode } from '../types';
import { analyzeRows } from '../lib/statistics';

interface Props {
  data: DataMatrix | null;
  onAnalyze: (results: StatsResult[]) => void;
  normalizeMode: NormalizeMode;
}

interface GroupRange {
  start: number;
  end: number;
}

const NORMALIZE_LABELS: Record<NormalizeMode, string> = {
  'none': 'Original',
  'sign': 'Sign Normalized',
  'absolute': 'Absolute Value'
};

export function StatsPanel({ data, onAnalyze, normalizeMode }: Props) {
  const [group1Range, setGroup1Range] = useState<GroupRange>({ start: 0, end: 2 });
  const [group2Range, setGroup2Range] = useState<GroupRange>({ start: 3, end: 4 });
  const [alpha, setAlpha] = useState(0.05);

  const numCols = useMemo(() => data?.data[0]?.length || 0, [data]);

  if (!data) {
    return (
      <div className="text-center py-12 text-slate-500">
        Please load data first
      </div>
    );
  }

  const handleAnalyze = () => {
    if (!data || data.data.length === 0) return;

    // 열 인덱스를 기반으로 그룹 데이터 생성
    // dataframes: [group][row][col] 형식으로 변환
    const group1Cols: number[] = [];
    const group2Cols: number[] = [];

    for (let col = group1Range.start; col <= group1Range.end && col < numCols; col++) {
      group1Cols.push(col);
    }
    for (let col = group2Range.start; col <= group2Range.end && col < numCols; col++) {
      group2Cols.push(col);
    }

    // 각 그룹의 데이터 추출 (행별로 해당 열의 값들)
    const group1Data: number[][] = data.data.map(row =>
      group1Cols.map(col => row[col])
    );
    const group2Data: number[][] = data.data.map(row =>
      group2Cols.map(col => row[col])
    );

    const dataframes = [group1Data, group2Data];
    const rowIds = data.rowIds || data.data.map((_, i) => `Row ${i + 1}`);

    const config: StatsConfig = {
      alpha,
      minSamples: 2
    };

    const results = analyzeRows(dataframes, rowIds, config);
    onAnalyze(results);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="font-medium text-slate-900 mb-3">Data Info</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Rows: </span>
            <span className="font-medium">{data.data.length}</span>
          </div>
          <div>
            <span className="text-slate-500">Columns: </span>
            <span className="font-medium">{numCols}</span>
          </div>
          <div>
            <span className="text-slate-500">Data Mode: </span>
            <span className={`font-medium ${normalizeMode !== 'none' ? 'text-blue-600' : ''}`}>
              {NORMALIZE_LABELS[normalizeMode]}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="font-medium text-slate-900 mb-3">Group Configuration</h3>
        <p className="text-sm text-slate-600 mb-4">
          Define groups by column indices (0-based) for statistical comparison.
          Each row will be analyzed independently.
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Group 1 (columns {group1Range.start}-{group1Range.end})
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={group1Range.start}
                  onChange={(e) => setGroup1Range({ ...group1Range, start: parseInt(e.target.value) || 0 })}
                  min={0}
                  max={numCols - 1}
                  className="w-20 px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Start"
                />
                <span className="py-2">to</span>
                <input
                  type="number"
                  value={group1Range.end}
                  onChange={(e) => setGroup1Range({ ...group1Range, end: parseInt(e.target.value) || 0 })}
                  min={0}
                  max={numCols - 1}
                  className="w-20 px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="End"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Group 2 (columns {group2Range.start}-{group2Range.end})
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={group2Range.start}
                  onChange={(e) => setGroup2Range({ ...group2Range, start: parseInt(e.target.value) || 0 })}
                  min={0}
                  max={numCols - 1}
                  className="w-20 px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Start"
                />
                <span className="py-2">to</span>
                <input
                  type="number"
                  value={group2Range.end}
                  onChange={(e) => setGroup2Range({ ...group2Range, end: parseInt(e.target.value) || 0 })}
                  min={0}
                  max={numCols - 1}
                  className="w-20 px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="End"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Significance level (α)
            </label>
            <select
              value={alpha}
              onChange={(e) => setAlpha(parseFloat(e.target.value))}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value={0.01}>0.01</option>
              <option value={0.05}>0.05</option>
              <option value={0.10}>0.10</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleAnalyze}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Run Analysis
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="font-medium text-slate-900 mb-2">Analysis Info</h3>
        <ul className="text-sm text-slate-600 space-y-1">
          <li>• T-test (or Welch's T-test) is used for 2 groups</li>
          <li>• Levene's test checks for equal variances</li>
          <li>• Each row is analyzed independently</li>
        </ul>
      </div>
    </div>
  );
}
