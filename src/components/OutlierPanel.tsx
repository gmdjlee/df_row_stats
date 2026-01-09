import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Scatter,
  Cell,
  Legend,
  Customized
} from 'recharts';
import { detectOutliers } from '../lib/outlier';
import { DataMatrix, OutlierConfig, OutlierMethod, OutlierResult, NormalizeMode } from '../types';
import { percentile, median as calcMedian } from '../lib/utils/math';

// Custom BoxPlot rendering component using Customized
interface BoxPlotCustomizedProps {
  xAxisMap?: Record<string, {
    scale: (value: string) => number | undefined;
    bandwidth?: number | (() => number);
    width?: number;
  }>;
  yAxisMap?: Record<string, { scale: (value: number) => number | undefined }>;
  formattedGraphicalItems?: Array<{
    props?: {
      data?: Array<{ x?: number; width?: number }>;
    };
  }>;
  data?: Array<{
    name: string;
    q1: number;
    q3: number;
    median: number;
    lowerWhisker: number;
    upperWhisker: number;
  }>;
  offset?: { left: number; top: number; width: number; height: number };
}

const BoxPlotCustomized = (props: BoxPlotCustomizedProps) => {
  const { xAxisMap, yAxisMap, data, formattedGraphicalItems, offset } = props;

  if (!xAxisMap || !yAxisMap || !data || data.length === 0) return null;

  const xAxis = xAxisMap['0'] || Object.values(xAxisMap)[0];
  const yAxis = yAxisMap['0'] || Object.values(yAxisMap)[0];

  if (!xAxis?.scale || !yAxis?.scale) return null;

  const xScale = xAxis.scale;
  const yScale = yAxis.scale;

  // Get bandwidth from various sources
  let barWidth: number;

  // Try to get bandwidth from xAxis
  if (typeof xAxis.bandwidth === 'function') {
    barWidth = xAxis.bandwidth();
  } else if (typeof xAxis.bandwidth === 'number') {
    barWidth = xAxis.bandwidth;
  } else if (formattedGraphicalItems?.[0]?.props?.data?.[0]?.width) {
    // Try to get from formatted items (Bar component)
    barWidth = formattedGraphicalItems[0].props.data[0].width;
  } else if (offset && data.length > 0) {
    // Calculate from offset and data count
    barWidth = (offset.width * 0.8) / data.length;
  } else {
    // Fallback to reasonable default
    barWidth = 40;
  }

  return (
    <g className="recharts-boxplot-layer">
      {data.map((item, index) => {
        const { name, q1, q3, median, lowerWhisker, upperWhisker } = item;

        // Get x position for this category
        const xPos = xScale(name);
        if (xPos === undefined || xPos === null) return null;

        // Convert data values to pixel coordinates
        const yQ1Raw = yScale(q1);
        const yQ3Raw = yScale(q3);
        const yMedianRaw = yScale(median);
        const yLowerRaw = yScale(lowerWhisker);
        const yUpperRaw = yScale(upperWhisker);

        // Validate all y coordinates
        if (
          yQ1Raw === undefined || yQ1Raw === null || isNaN(yQ1Raw) ||
          yQ3Raw === undefined || yQ3Raw === null || isNaN(yQ3Raw) ||
          yMedianRaw === undefined || yMedianRaw === null || isNaN(yMedianRaw) ||
          yLowerRaw === undefined || yLowerRaw === null || isNaN(yLowerRaw) ||
          yUpperRaw === undefined || yUpperRaw === null || isNaN(yUpperRaw)
        ) {
          return null;
        }

        const yQ1 = yQ1Raw;
        const yQ3 = yQ3Raw;
        const yMedian = yMedianRaw;
        const yLower = yLowerRaw;
        const yUpper = yUpperRaw;

        const boxWidth = barWidth * 0.5;
        const xCenter = xPos + barWidth / 2;
        const xLeft = xCenter - boxWidth / 2;
        const whiskerWidth = boxWidth * 0.5;

        return (
          <g key={`boxplot-${index}`}>
            {/* Lower Whisker Line (vertical) */}
            <line
              x1={xCenter}
              y1={yQ1}
              x2={xCenter}
              y2={yLower}
              stroke="#64748b"
              strokeWidth={1.5}
            />
            {/* Lower Whisker Cap (horizontal) */}
            <line
              x1={xCenter - whiskerWidth / 2}
              y1={yLower}
              x2={xCenter + whiskerWidth / 2}
              y2={yLower}
              stroke="#64748b"
              strokeWidth={2}
            />
            {/* Upper Whisker Line (vertical) */}
            <line
              x1={xCenter}
              y1={yQ3}
              x2={xCenter}
              y2={yUpper}
              stroke="#64748b"
              strokeWidth={1.5}
            />
            {/* Upper Whisker Cap (horizontal) */}
            <line
              x1={xCenter - whiskerWidth / 2}
              y1={yUpper}
              x2={xCenter + whiskerWidth / 2}
              y2={yUpper}
              stroke="#64748b"
              strokeWidth={2}
            />
            {/* IQR Box */}
            <rect
              x={xLeft}
              y={Math.min(yQ1, yQ3)}
              width={boxWidth}
              height={Math.abs(yQ3 - yQ1) || 1}
              fill="#60a5fa"
              stroke="#3b82f6"
              strokeWidth={1.5}
            />
            {/* Median Line */}
            <line
              x1={xLeft}
              y1={yMedian}
              x2={xLeft + boxWidth}
              y2={yMedian}
              stroke="#1e40af"
              strokeWidth={2.5}
            />
          </g>
        );
      })}
    </g>
  );
};

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

  // Box plot data for each row (outlier detection is per-row)
  const boxPlotData = useMemo(() => {
    if (!data.data || data.data.length === 0) return [];

    const chartData: Array<{
      name: string;
      rowIndex: number;
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
      outliers: Array<{ x: string; y: number; colIndex: number }>;
    }> = [];

    for (let row = 0; row < data.data.length; row++) {
      const rowData = data.data[row].filter(x => !isNaN(x));
      if (rowData.length === 0) continue;

      const sorted = [...rowData].sort((a, b) => a - b);
      const q1 = percentile(sorted, 0.25);
      const q3 = percentile(sorted, 0.75);
      const med = calcMedian(sorted);
      const iqr = q3 - q1;

      // Calculate whisker bounds (1.5 IQR)
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      // Find actual whisker values (min/max within bounds)
      const withinLower = sorted.filter(v => v >= lowerBound);
      const withinUpper = sorted.filter(v => v <= upperBound);
      const lowerWhisker = withinLower.length > 0 ? Math.min(...withinLower) : q1;
      const upperWhisker = withinUpper.length > 0 ? Math.max(...withinUpper) : q3;

      // Find outliers for this row
      const outliers: Array<{ x: string; y: number; colIndex: number }> = [];
      data.data[row].forEach((val, colIndex) => {
        if (!isNaN(val) && (val < lowerBound || val > upperBound)) {
          outliers.push({
            x: data.rowIds?.[row] || `Row ${row + 1}`,
            y: val,
            colIndex
          });
        }
      });

      const name = data.rowIds?.[row] || `Row ${row + 1}`;

      chartData.push({
        name,
        rowIndex: row,
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

  // Get all outliers for scatter plot (per-row detection)
  const scatterOutliers = useMemo(() => {
    if (!result) return [];
    return result.outlierIndices.map(([row, col]) => ({
      x: data.rowIds?.[row] || `Row ${row + 1}`,
      y: data.data[row][col],
      rowIndex: row,
      colIndex: col,
      colName: data.headers?.[col] || `Col ${col + 1}`
    }));
  }, [result, data]);

  // Calculate Y axis domain to include all data points (whiskers + outliers)
  const yDomain = useMemo((): [number | 'auto', number | 'auto'] => {
    if (boxPlotData.length === 0) return ['auto', 'auto'];

    let minVal = Math.min(...boxPlotData.map(d => d.lowerWhisker));
    let maxVal = Math.max(...boxPlotData.map(d => d.upperWhisker));

    // Include outliers in domain
    if (scatterOutliers.length > 0) {
      const outlierValues = scatterOutliers.map(o => o.y);
      minVal = Math.min(minVal, ...outlierValues);
      maxVal = Math.max(maxVal, ...outlierValues);
    }

    // Add 5% padding
    const padding = (maxVal - minVal) * 0.05;
    return [minVal - padding, maxVal + padding];
  }, [boxPlotData, scatterOutliers]);

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
                    value: 'Row',
                    position: 'insideBottom',
                    offset: -10,
                    style: { fontSize: 12, fill: '#64748b' }
                  }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  domain={yDomain}
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
                    { value: 'Whiskers', type: 'line' as const, color: '#64748b' },
                    { value: 'Median', type: 'line' as const, color: '#1e40af' },
                    ...(result && result.outlierCount > 0
                      ? [{ value: 'Outliers', type: 'circle' as const, color: '#dc2626' }]
                      : [])
                  ]}
                />
                {/* Hidden bar to establish the data domain and x-axis categories */}
                <Bar dataKey="q3" fill="transparent" />
                {/* Custom BoxPlot rendering */}
                <Customized
                  component={(props: BoxPlotCustomizedProps) => (
                    <BoxPlotCustomized {...props} data={boxPlotData} />
                  )}
                />
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
