import { useState } from 'react';
import { DataMatrix, StatsResult } from '../types';

interface Props {
  data: DataMatrix | null;
  onAnalyze: (results: StatsResult[]) => void;
}

export function StatsPanel({ data, onAnalyze }: Props) {
  const [groupIndices, setGroupIndices] = useState<[number, number]>([0, 3]);
  const [alpha] = useState(0.05);

  if (!data) {
    return (
      <div className="text-center py-12 text-slate-500">
        Please load data first
      </div>
    );
  }

  const handleAnalyze = () => {
    // Simple mock implementation
    const results: StatsResult[] = data.rowIds?.map((rowId) => ({
      rowId,
      groupMeans: {
        Group1_Mean: 10.5,
        Group2_Mean: 10.8
      },
      testType: 'T-test' as const,
      statistic: 1.23,
      pValue: 0.045,
      isSignificant: true,
      leveneP: 0.567,
      equalVariance: true
    })) || [];

    onAnalyze(results);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="font-medium text-slate-900 mb-3">Group Configuration</h3>
        <p className="text-sm text-slate-600 mb-4">
          Define groups by column indices for statistical comparison
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Group 1 (columns):
            </label>
            <input
              type="text"
              value={`${groupIndices[0]}-${groupIndices[1]}`}
              onChange={(e) => {
                const parts = e.target.value.split('-');
                if (parts.length === 2) {
                  const start = parseInt(parts[0]);
                  const end = parseInt(parts[1]);
                  if (!isNaN(start) && !isNaN(end)) {
                    setGroupIndices([start, end]);
                  }
                }
              }}
              placeholder="0-3"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="text-sm text-slate-500">
            Significance level (α): {alpha}
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
        <h3 className="font-medium text-slate-900 mb-2">Note</h3>
        <p className="text-sm text-slate-600">
          This is a simplified demonstration. For full row-by-row statistical analysis,
          the groups should be properly configured based on your experimental design.
        </p>
      </div>
    </div>
  );
}
