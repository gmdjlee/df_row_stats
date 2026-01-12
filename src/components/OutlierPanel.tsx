import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Customized
} from 'recharts';
import { detectOutliers } from '../lib/outlier';
import { DataMatrix, OutlierConfig, OutlierMethod, OutlierResult, NormalizeMode } from '../types';
import { percentile, median as calcMedian } from '../lib/utils/math';

// Custom BoxPlot + Scatter rendering component using Customized
interface BoxPlotWithScatterProps {
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
  boxPlotData?: Array<{
    name: string;
    displayName: string;
    q1: number;
    q3: number;
    median: number;
    lowerWhisker: number;
    upperWhisker: number;
  }>;
  scatterData?: Map<string, Array<{
    y: number;
    colIndex: number;
    colName: string;
    isOutlier: boolean;
  }>>;
  offset?: { left: number; top: number; width: number; height: number };
}

const BoxPlotWithScatter = (props: BoxPlotWithScatterProps) => {
  const { xAxisMap, yAxisMap, boxPlotData, scatterData, formattedGraphicalItems, offset } = props;

  if (!xAxisMap || !yAxisMap || !boxPlotData || boxPlotData.length === 0) return null;

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
  } else if (offset && boxPlotData.length > 0) {
    // Calculate from offset and data count
    barWidth = (offset.width * 0.8) / boxPlotData.length;
  } else {
    // Fallback to reasonable default
    barWidth = 40;
  }

  return (
    <g className="recharts-boxplot-scatter-layer">
      {boxPlotData.map((item, index) => {
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

        // Get scatter points for this row
        const rowPoints = scatterData?.get(name) || [];

        return (
          <g key={`boxplot-${index}`}>
            {/* Outlier points only - render behind box plot */}
            {rowPoints.map((point, pointIndex) => {
              const yPixel = yScale(point.y);
              if (yPixel === undefined || yPixel === null || isNaN(yPixel)) return null;

              // Spread points horizontally within the bar width to avoid overlap
              const spreadWidth = barWidth * 0.6;
              const pointsCount = rowPoints.length;
              const xOffset = pointsCount > 1
                ? (pointIndex / (pointsCount - 1) - 0.5) * spreadWidth
                : 0;

              return (
                <circle
                  key={`outlier-${index}-${pointIndex}`}
                  cx={xCenter + xOffset}
                  cy={yPixel}
                  r={5}
                  fill="#dc2626"
                  stroke="#b91c1c"
                  strokeWidth={1.5}
                  opacity={0.9}
                />
              );
            })}
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
              fillOpacity={0.7}
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

  // Zoom state: 1 = 100%, 2 = 200% (zoomed in), 0.5 = 50% (zoomed out)
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleDetect = () => {
    const outlierResult = detectOutliers(data.data, config);
    onDetect(outlierResult);
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.5, 10));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.5, 0.1));
  const handleZoomReset = () => setZoomLevel(1);

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
  // IMPORTANT: Use unique 'name' (based on rowIndex) to prevent chart merging when rowIds are duplicated
  const boxPlotData = useMemo(() => {
    if (!data.data || data.data.length === 0) return [];

    const chartData: Array<{
      name: string;           // Unique identifier for chart (index-based)
      displayName: string;    // Display label (rowId or Row N)
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
            x: `${row}`,  // Use row index as unique x key
            y: val,
            colIndex
          });
        }
      });

      // Use row index as unique name to prevent merging in charts
      const name = `${row}`;
      const displayName = data.rowIds?.[row] || `Row ${row + 1}`;

      chartData.push({
        name,
        displayName,
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

  // Get ONLY outlier points for scatter plot, grouped by row for proper positioning
  // Normal points are excluded to keep the chart clean
  const outlierDataByRow = useMemo(() => {
    if (!data.data || data.data.length === 0 || !result?.outlierMask) {
      return new Map<string, Array<{
        y: number;
        colIndex: number;
        colName: string;
        isOutlier: boolean;
      }>>();
    }

    const pointsByRow = new Map<string, Array<{
      y: number;
      colIndex: number;
      colName: string;
      isOutlier: boolean;
    }>>();

    for (let row = 0; row < data.data.length; row++) {
      const rowName = `${row}`;
      const rowPoints: Array<{
        y: number;
        colIndex: number;
        colName: string;
        isOutlier: boolean;
      }> = [];

      for (let col = 0; col < data.data[row].length; col++) {
        const val = data.data[row][col];
        const isOutlier = result.outlierMask[row]?.[col] ?? false;
        // Only include outliers
        if (typeof val === 'number' && !isNaN(val) && isOutlier) {
          rowPoints.push({
            y: val,
            colIndex: col,
            colName: data.headers?.[col] || `Col ${col + 1}`,
            isOutlier: true
          });
        }
      }
      pointsByRow.set(rowName, rowPoints);
    }
    return pointsByRow;
  }, [data, result]);

  // Flatten all data points for domain calculation and total count
  const allDataPoints = useMemo(() => {
    const points: Array<{
      name: string;
      displayName: string;
      y: number;
      rowIndex: number;
      colIndex: number;
      colName: string;
      isOutlier: boolean;
    }> = [];

    for (let row = 0; row < (data.data?.length || 0); row++) {
      for (let col = 0; col < (data.data[row]?.length || 0); col++) {
        const val = data.data[row][col];
        if (typeof val === 'number' && !isNaN(val)) {
          const isOutlier = result?.outlierMask?.[row]?.[col] ?? false;
          points.push({
            name: `${row}`,
            displayName: data.rowIds?.[row] || `Row ${row + 1}`,
            y: val,
            rowIndex: row,
            colIndex: col,
            colName: data.headers?.[col] || `Col ${col + 1}`,
            isOutlier
          });
        }
      }
    }
    return points;
  }, [data, result]);

  // Calculate Y axis domain to include all data points (including negative values)
  // Apply zoom level to the domain
  const yDomain = useMemo((): [number, number] => {
    if (allDataPoints.length === 0) return [-10, 10]; // Default reasonable range

    const allValues = allDataPoints.map(p => p.y);
    let minVal = Math.min(...allValues);
    let maxVal = Math.max(...allValues);

    // Ensure we have a valid range
    if (minVal === maxVal) {
      // All values are the same, create a range around it
      const rangeVal = Math.abs(minVal) * 0.1 || 1;
      minVal = minVal - rangeVal;
      maxVal = maxVal + rangeVal;
    }

    // Add 10% padding for better visibility
    const range = maxVal - minVal;
    const padding = range * 0.1;
    const baseMin = minVal - padding;
    const baseMax = maxVal + padding;

    // Apply zoom: zoom > 1 means zoomed in (smaller range), zoom < 1 means zoomed out
    const center = (baseMin + baseMax) / 2;
    const halfRange = (baseMax - baseMin) / 2 / zoomLevel;

    return [center - halfRange, center + halfRange];
  }, [allDataPoints, zoomLevel]);

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
                  {result.outlierIndices.map(([row, col], i) => {
                    const value = data.data[row]?.[col];
                    return (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-2">{data.rowIds?.[row] || `Row ${row + 1}`}</td>
                        <td className="px-3 py-2">Col {col + 1}</td>
                        <td className="px-3 py-2 text-right font-mono text-red-600">
                          {typeof value === 'number' && !isNaN(value) ? value.toFixed(4) : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-slate-900">
              Data Distribution (Box Plot)
              <span className="ml-2 text-sm font-normal text-slate-500">
                • {allDataPoints.length} data points
                {result && result.outlierCount > 0 && (
                  <span className="text-red-600 ml-1">
                    ({result.outlierCount} outliers)
                  </span>
                )}
              </span>
            </h3>
            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Zoom:</span>
              <button
                onClick={handleZoomOut}
                className="px-2 py-1 text-sm bg-slate-100 hover:bg-slate-200 rounded border border-slate-300"
                title="Zoom Out"
              >
                -
              </button>
              <span className="text-sm font-mono w-16 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="px-2 py-1 text-sm bg-slate-100 hover:bg-slate-200 rounded border border-slate-300"
                title="Zoom In"
              >
                +
              </button>
              <button
                onClick={handleZoomReset}
                className="px-2 py-1 text-sm bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 ml-1"
                title="Reset Zoom"
              >
                Reset
              </button>
            </div>
          </div>
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
                  tickFormatter={(value) => {
                    // Find the displayName for this index
                    const item = boxPlotData.find(d => d.name === value);
                    return item?.displayName || value;
                  }}
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
                  allowDataOverflow={false}
                  tickFormatter={(value) => typeof value === 'number' ? value.toFixed(1) : value}
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

                      // Check if this is a scatter data point (has colName property)
                      if (d.colName !== undefined) {
                        const isOutlier = d.isOutlier === true;
                        return (
                          <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
                            <div className={`font-semibold mb-2 ${isOutlier ? 'text-red-600' : 'text-blue-600'}`}>
                              {isOutlier ? 'Outlier' : 'Data Point'}
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-500">Row:</span>
                                <span className="font-mono">{d.displayName || d.name}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-500">Column:</span>
                                <span className="font-mono">{d.colName}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-500">Value:</span>
                                <span className={`font-mono font-semibold ${isOutlier ? 'text-red-600' : ''}`}>
                                  {typeof d.y === 'number' ? d.y.toFixed(4) : d.y}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Box plot data - verify required properties exist
                      if (d.max === undefined || d.q3 === undefined || d.median === undefined ||
                          d.q1 === undefined || d.min === undefined) {
                        return null;
                      }

                      return (
                        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
                          <div className="font-semibold mb-2">{d.displayName || d.name}</div>
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
                            {d.outliers && d.outliers.length > 0 && (
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
                {/* Custom BoxPlot + Outliers rendering (normal points excluded) */}
                <Customized
                  component={(props: BoxPlotWithScatterProps) => (
                    <BoxPlotWithScatter
                      {...props}
                      boxPlotData={boxPlotData}
                      scatterData={outlierDataByRow}
                    />
                  )}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 text-sm text-slate-500">
            <div className="flex gap-6 flex-wrap">
              <span>• Box shows Q1 to Q3 (IQR)</span>
              <span>• Whiskers extend to 1.5 × IQR</span>
              {result && result.outlierCount > 0 && (
                <span className="text-red-600">• Red dots = outliers only</span>
              )}
              <span>• Use zoom controls to adjust view</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
