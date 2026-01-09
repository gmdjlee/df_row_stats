import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
  Cell,
  Legend
} from 'recharts';
import { detectOutliers } from '../lib/outlier';
import { DataMatrix, OutlierConfig, OutlierMethod, OutlierResult, NormalizeMode } from '../types';
import { percentile, median as calcMedian } from '../lib/utils/math';

interface Props {
  data: DataMatrix;
  onDetect: (result: OutlierResult) => void;
  result: OutlierResult | null;
  normalizeMode: NormalizeMode;
}

const NORMALIZE_LABELS: Record<NormalizeMode, string> = {
  'none': 'Original',
  'sign': 'Sign Normalized',
  'absolute': 'Absolute Value'
};

const METHODS: { value: OutlierMethod; label: string; desc: string }[] = [
  { value: 'zscore', label: 'Z-Score', desc: 'Standard deviation based' },
  { value: 'iqr', label: 'IQR', desc: 'Interquartile range based' },
  { value: 'mad', label: 'Modified Z-Score', desc: 'Median absolute deviation based' },
];

export function OutlierPanel({ data, onDetect, result, normalizeMode }: Props) {
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

  // Box plot data for each column
  const boxPlotData = useMemo(() => {
    if (!data.data || data.data.length === 0) return [];

    const numCols = data.data[0]?.length || 0;
    const chartData: Array<{
      name: string;
      min: number;
      q1: number;
      median: number;
      q3: number;
      max: number;
      lowerWhisker: number;
      upperWhisker: number;
      boxStart: number;
      boxSize: number;
      lowerMid: number;
      upperMid: number;
      outliers: Array<{ x: string; y: number }>;
    }> = [];

    for (let col = 0; col < numCols; col++) {
      const colData = data.data.map(row => row[col]).filter(x => !isNaN(x));
      if (colData.length === 0) continue;

      const sorted = [...colData].sort((a, b) => a - b);
      const q1 = percentile(sorted, 0.25);
      const q3 = percentile(sorted, 0.75);
      const med = calcMedian(sorted);
      const iqr = q3 - q1;

      // Calculate whisker bounds (1.5 IQR)
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      // Find actual whisker values (min/max within bounds)
      const lowerWhisker = Math.min(...sorted.filter(v => v >= lowerBound));
      const upperWhisker = Math.max(...sorted.filter(v => v <= upperBound));

      // Find outliers
      const outliers = sorted
        .filter(v => v < lowerBound || v > upperBound)
        .map(v => ({ x: data.headers?.[col] || `Col ${col + 1}`, y: v }));

      const name = data.headers?.[col] || `Col ${col + 1}`;

      chartData.push({
        name,
        min: Math.min(...sorted),
        q1,
        median: med,
        q3,
        max: Math.max(...sorted),
        lowerWhisker,
        upperWhisker,
        // For stacked bar representation of box plot
        boxStart: lowerWhisker,
        boxSize: upperWhisker - lowerWhisker,
        lowerMid: q1 - lowerWhisker,
        upperMid: upperWhisker - q3,
        outliers
      });
    }

    return chartData;
  }, [data]);

  // Get all outliers for scatter plot
  const scatterOutliers = useMemo(() => {
    if (!result) return [];
    return result.outlierIndices.map(([row, col]) => ({
      x: data.headers?.[col] || `Col ${col + 1}`,
      y: data.data[row][col],
      row: data.rowIds?.[row] || `Row ${row + 1}`,
      col: col
    }));
  }, [result, data]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="font-medium text-slate-900 mb-3">Data Summary</h3>
        <div className="grid grid-cols-5 gap-4 text-center">
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
          <div>
            <div className={`text-lg font-semibold ${normalizeMode !== 'none' ? 'text-blue-600' : 'text-slate-500'}`}>
              {NORMALIZE_LABELS[normalizeMode]}
            </div>
            <div className="text-sm text-slate-500">Data Mode</div>
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

      {/* Box Plot Visualization */}
      {boxPlotData.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="font-medium text-slate-900 mb-3">
            Data Distribution (Box Plot)
            {result && result.outlierCount > 0 && (
              <span className="ml-2 text-sm font-normal text-red-600">
                • {result.outlierCount} outliers shown in red
              </span>
            )}
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={boxPlotData}
                margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  label={{
                    value: 'Column',
                    position: 'insideBottom',
                    offset: -10,
                    style: { fontSize: 12, fill: '#64748b' }
                  }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  label={{
                    value: 'Value',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 12, fill: '#64748b' }
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
                          <div className="font-semibold mb-2">{d.name}</div>
                          <div className="space-y-1">
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-500">Max:</span>
                              <span className="font-mono">{d.max.toFixed(4)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-500">Q3 (75%):</span>
                              <span className="font-mono">{d.q3.toFixed(4)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-500">Median:</span>
                              <span className="font-mono font-semibold">{d.median.toFixed(4)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-500">Q1 (25%):</span>
                              <span className="font-mono">{d.q1.toFixed(4)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-500">Min:</span>
                              <span className="font-mono">{d.min.toFixed(4)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-500">IQR:</span>
                              <span className="font-mono">{(d.q3 - d.q1).toFixed(4)}</span>
                            </div>
                            {d.outliers.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-slate-200">
                                <span className="text-red-600 font-medium">
                                  Outliers: {d.outliers.length}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  payload={[
                    { value: 'Q1 ~ Q3 (IQR)', type: 'rect' as const, color: '#60a5fa' },
                    { value: 'Whiskers', type: 'line' as const, color: '#94a3b8' },
                    { value: 'Median', type: 'line' as const, color: '#1e40af' },
                    ...(result && result.outlierCount > 0
                      ? [{ value: 'Outliers', type: 'circle' as const, color: '#dc2626' }]
                      : [])
                  ]}
                />
                {/* Lower Whisker Area (transparent to offset) */}
                <Bar dataKey="boxStart" stackId="box" fill="transparent" />
                {/* Box: Q1 to lower whisker */}
                <Bar dataKey="lowerMid" stackId="box" fill="#93c5fd" />
                {/* Box: Q1 to Q3 */}
                <Bar dataKey={(d) => d.q3 - d.q1} stackId="box" fill="#60a5fa" name="IQR">
                  {boxPlotData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill="#60a5fa" />
                  ))}
                </Bar>
                {/* Box: Q3 to upper whisker */}
                <Bar dataKey="upperMid" stackId="box" fill="#93c5fd" />
                {/* Median Line - rendered as reference lines */}
                {boxPlotData.map((d, idx) => (
                  <ReferenceLine
                    key={`median-${idx}`}
                    y={d.median}
                    stroke="#1e40af"
                    strokeWidth={2}
                    segment={[
                      { x: d.name, y: d.median },
                      { x: d.name, y: d.median }
                    ]}
                  />
                ))}
                {/* Outliers */}
                {result && (
                  <Scatter
                    name="Outliers"
                    data={scatterOutliers}
                    fill="#dc2626"
                  >
                    {scatterOutliers.map((_, index) => (
                      <Cell key={`outlier-${index}`} fill="#dc2626" />
                    ))}
                  </Scatter>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 text-sm text-slate-500">
            <div className="flex gap-6">
              <span>• Box shows Q1 to Q3 (Interquartile Range)</span>
              <span>• Whiskers extend to 1.5 × IQR</span>
              {result && result.outlierCount > 0 && (
                <span className="text-red-600">• Red dots = detected outliers</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
