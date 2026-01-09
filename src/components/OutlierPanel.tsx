import { useState, useMemo } from 'react';
import { detectOutliers } from '../lib/outlier';
import { DataMatrix, OutlierConfig, OutlierMethod, OutlierResult } from '../types';

interface Props {
  data: DataMatrix;
  onDetect: (result: OutlierResult) => void;
  result: OutlierResult | null;
}

const METHODS: { value: OutlierMethod; label: string; desc: string }[] = [
  { value: 'zscore', label: 'Z-Score', desc: 'Standard deviation based' },
  { value: 'iqr', label: 'IQR', desc: 'Interquartile range based' },
  { value: 'mad', label: 'Modified Z-Score', desc: 'Median absolute deviation based' },
];

export function OutlierPanel({ data, onDetect, result }: Props) {
  const [config, setConfig] = useState<OutlierConfig>({
    method: 'iqr',
    multiplier: 1.5,
    threshold: 3.0
  });

  const handleDetect = () => {
    const outlierResult = detectOutliers(data.data, config);
    onDetect(outlierResult);
  };

  const summary = useMemo(() => {
    const flat = data.data.flat().filter(x => !isNaN(x));
    return {
      rows: data.data.length,
      cols: data.data[0]?.length || 0,
      total: flat.length,
      nanCount: data.data.flat().filter(x => isNaN(x)).length
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="font-medium text-slate-900 mb-3">Data Summary</h3>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-semibold text-slate-900">{summary.rows}</div>
            <div className="text-sm text-slate-500">Rows</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-slate-900">{summary.cols}</div>
            <div className="text-sm text-slate-500">Columns</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-slate-900">{summary.total}</div>
            <div className="text-sm text-slate-500">Total Values</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-amber-600">{summary.nanCount}</div>
            <div className="text-sm text-slate-500">Missing</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="font-medium text-slate-900 mb-3">Detection Method</h3>
        <div className="grid grid-cols-3 gap-4">
          {METHODS.map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => setConfig({ ...config, method: value })}
              className={`
                p-4 rounded-lg border-2 text-left transition-colors
                ${config.method === value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'}
              `}
            >
              <div className="font-medium">{label}</div>
              <div className="text-sm text-slate-500 mt-1">{desc}</div>
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-6">
          {config.method === 'iqr' && (
            <label className="flex items-center gap-2">
              <span className="text-sm text-slate-700">Multiplier (k):</span>
              <input
                type="number"
                value={config.multiplier}
                onChange={(e) => setConfig({ ...config, multiplier: parseFloat(e.target.value) })}
                step={0.5}
                min={0.5}
                max={5}
                className="w-20 px-2 py-1 border border-slate-300 rounded"
              />
            </label>
          )}
          {(config.method === 'zscore' || config.method === 'mad') && (
            <label className="flex items-center gap-2">
              <span className="text-sm text-slate-700">Threshold:</span>
              <input
                type="number"
                value={config.threshold}
                onChange={(e) => setConfig({ ...config, threshold: parseFloat(e.target.value) })}
                step={0.5}
                min={1}
                max={5}
                className="w-20 px-2 py-1 border border-slate-300 rounded"
              />
            </label>
          )}
        </div>

        <button
          onClick={handleDetect}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Detect Outliers
        </button>
      </div>

      {result && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="font-medium text-slate-900 mb-3">Detection Result</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-semibold text-red-600">
                {result.outlierCount}
              </div>
              <div className="text-sm text-slate-500">Outliers Found</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-slate-900">
                {(result.outlierRatio * 100).toFixed(2)}%
              </div>
              <div className="text-sm text-slate-500">Outlier Ratio</div>
            </div>
            {result.bounds && (
              <div>
                <div className="text-lg font-mono text-slate-700">
                  [{result.bounds.lower.toFixed(2)}, {result.bounds.upper.toFixed(2)}]
                </div>
                <div className="text-sm text-slate-500">Valid Range</div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <h4 className="text-sm font-medium text-slate-700 mb-2">
              Outlier Details ({result.outlierIndices.length})
            </h4>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Row</th>
                    <th className="px-3 py-2 text-left">Column</th>
                    <th className="px-3 py-2 text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {result.outlierIndices.map(([row, col], i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-3 py-2">{data.rowIds?.[row] || `Row ${row + 1}`}</td>
                      <td className="px-3 py-2">Col {col + 1}</td>
                      <td className="px-3 py-2 text-right font-mono text-red-600">
                        {data.data[row][col].toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.outlierIndices.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No outliers detected
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
