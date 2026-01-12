import { useState, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { OutlierResult, StatsResult, DataMatrix, NormalizeMode } from '../types';

interface Props {
  outlierResult: OutlierResult | null;
  statsResults: StatsResult[] | null;
  data: DataMatrix | null;
  normalizeMode: NormalizeMode;
}

// Color palette for chart lines
const COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea',
  '#0891b2', '#c026d3', '#ea580c', '#4f46e5', '#059669'
];

const NORMALIZE_LABELS: Record<NormalizeMode, string> = {
  'none': 'Original',
  'sign': 'Sign Normalized',
  'absolute': 'Absolute Value'
};

export function ResultPanel({ outlierResult, statsResults, data, normalizeMode }: Props) {
  // Track which lines are visible (all visible by default)
  const [hiddenLines, setHiddenLines] = useState<Set<string>>(new Set());

  // Get all unique group names from results
  const groupNames = useMemo(() => {
    if (!statsResults || statsResults.length === 0) return [];
    const firstResult = statsResults[0];
    return Object.keys(firstResult.groupMeans).sort();
  }, [statsResults]);

  const handleExportCSV = () => {
    if (!statsResults) return;

    // Dynamic headers based on group names
    const headers = ['Row_ID', ...groupNames, 'Test_Type', 'Statistic', 'P_Value', 'Significant'];
    const rows = statsResults.map(r => [
      r.rowId,
      ...groupNames.map(name => r.groupMeans[name]?.toFixed(4) || ''),
      r.testType,
      r.statistic.toFixed(4),
      r.pValue.toFixed(6),
      r.isSignificant ? 'Yes' : 'No'
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analysis_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Prepare data for chart: x-axis = row index (unique), each line = column (sample)
  // Use index as unique key to prevent chart merging when rowIds are duplicated
  const chartData = useMemo(() => {
    if (!data?.data || data.data.length === 0) return [];

    const rowIds = data.rowIds || data.data.map((_, i) => `Row ${i + 1}`);

    return data.data.map((row, rowIndex) => {
      const point: Record<string, string | number> = {
        index: rowIndex,           // Unique index for chart x-axis
        displayRowId: rowIds[rowIndex]  // Display label (may have duplicates)
      };
      row.forEach((val, colIndex) => {
        const colName = data.headers?.[colIndex] || `Sample ${colIndex + 1}`;
        point[colName] = isNaN(val) ? 0 : val;
      });
      return point;
    });
  }, [data]);

  // Get column names for chart lines
  const columnNames = useMemo(() => {
    if (!data?.data || data.data.length === 0) return [];
    const numCols = data.data[0].length;
    return Array.from({ length: numCols }, (_, i) =>
      data.headers?.[i] || `Sample ${i + 1}`
    );
  }, [data]);

  // Toggle line visibility
  const handleLegendClick = useCallback((dataKey: string) => {
    setHiddenLines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dataKey)) {
        newSet.delete(dataKey);
      } else {
        newSet.add(dataKey);
      }
      return newSet;
    });
  }, []);

  // Show/Hide all lines
  const handleShowAll = useCallback(() => {
    setHiddenLines(new Set());
  }, []);

  const handleHideAll = useCallback(() => {
    setHiddenLines(new Set(columnNames));
  }, [columnNames]);

  // Custom legend with click handler
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderLegend = useCallback((props: any) => {
    const { payload } = props;
    if (!payload) return null;

    return (
      <div className="flex flex-wrap justify-center gap-2 pt-4">
        {payload.map((entry: { value: string; color?: string }, index: number) => {
          const value = entry.value;
          const color = entry.color || '#000';
          const isHidden = hiddenLines.has(value);
          return (
            <button
              key={`legend-${index}`}
              onClick={() => handleLegendClick(value)}
              className={`
                flex items-center gap-1.5 px-2 py-1 rounded text-xs
                transition-all cursor-pointer
                ${isHidden
                  ? 'bg-slate-100 text-slate-400 line-through'
                  : 'bg-slate-50 hover:bg-slate-100'}
              `}
            >
              <span
                className={`w-3 h-3 rounded-full ${isHidden ? 'opacity-30' : ''}`}
                style={{ backgroundColor: color }}
              />
              {value}
            </button>
          );
        })}
      </div>
    );
  }, [hiddenLines, handleLegendClick]);

  // Determine axis labels based on data
  const xAxisLabel = useMemo(() => {
    if (data?.rowIds && data.rowIds.length > 0) {
      return 'Row ID';
    }
    return 'Row Index';
  }, [data]);

  const yAxisLabel = useMemo(() => {
    if (data?.headers && data.headers.length > 0) {
      return 'Sample Value';
    }
    return 'Value';
  }, [data]);

  const significantCount = statsResults?.filter(r => r.isSignificant).length || 0;
  const visibleLineCount = columnNames.length - hiddenLines.size;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {outlierResult && (
          <>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-500">Outliers Detected</div>
              <div className="text-2xl font-semibold text-red-600 mt-1">
                {outlierResult.outlierCount}
              </div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-500">Outlier Ratio</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">
                {(outlierResult.outlierRatio * 100).toFixed(2)}%
              </div>
            </div>
          </>
        )}
        {statsResults && (
          <>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-500">Total Rows</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">
                {statsResults.length}
              </div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-500">Significant (p &lt; 0.05)</div>
              <div className="text-2xl font-semibold text-green-600 mt-1">
                {significantCount}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Interactive Line Chart */}
      {data && chartData.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-medium text-slate-900">Data Visualization</h3>
              <p className="text-sm text-slate-500 mt-1">
                Data Mode: <span className={normalizeMode !== 'none' ? 'text-blue-600 font-medium' : ''}>
                  {NORMALIZE_LABELS[normalizeMode]}
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleShowAll}
                disabled={hiddenLines.size === 0}
                className="px-3 py-1.5 text-sm rounded-lg bg-slate-100 text-slate-700
                  hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Show All
              </button>
              <button
                onClick={handleHideAll}
                disabled={hiddenLines.size === columnNames.length}
                className="px-3 py-1.5 text-sm rounded-lg bg-slate-100 text-slate-700
                  hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hide All
              </button>
            </div>
          </div>

          <div className="mb-2 text-sm text-slate-600">
            Showing {visibleLineCount} of {columnNames.length} samples
            {hiddenLines.size > 0 && ' (click legend items to toggle)'}
          </div>

          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="index"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => {
                    // Use displayRowId if available for labels
                    const item = chartData[value];
                    return String(item?.displayRowId ?? `Row ${value + 1}`);
                  }}
                  label={{
                    value: xAxisLabel,
                    position: 'insideBottom',
                    offset: -15,
                    style: { fontSize: 12, fill: '#64748b' }
                  }}
                  angle={data.rowIds && data.rowIds.some(id => id.length > 5) ? -45 : 0}
                  textAnchor={data.rowIds && data.rowIds.some(id => id.length > 5) ? 'end' : 'middle'}
                  height={data.rowIds && data.rowIds.some(id => id.length > 5) ? 60 : 30}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  label={{
                    value: yAxisLabel,
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 12, fill: '#64748b' }
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number, name: string) => [value.toFixed(4), name]}
                  labelFormatter={(label) => {
                    const idx = label as number;
                    const item = chartData[idx];
                    const displayId = item?.displayRowId ?? `Row ${idx + 1}`;
                    return `Row: ${displayId}`;
                  }}
                />
                <Legend content={renderLegend} />
                {columnNames.map((colName, idx) => (
                  <Line
                    key={colName}
                    type="monotone"
                    dataKey={colName}
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    hide={hiddenLines.has(colName)}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {statsResults && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-medium text-slate-900">Statistical Analysis Results</h3>
              <p className="text-sm text-slate-500 mt-1">
                {groupNames.length} groups analyzed •
                {statsResults[0]?.testType === 'ANOVA' ? ' One-way ANOVA' : ' T-test comparison'}
              </p>
            </div>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg
                hover:bg-slate-200 text-sm"
            >
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left">Row ID</th>
                  {groupNames.map((name, idx) => (
                    <th key={name} className="px-3 py-2 text-right">
                      <span className={`inline-flex items-center gap-1`}>
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: [
                              '#3b82f6', '#ef4444', '#22c55e', '#a855f7',
                              '#f97316', '#14b8a6', '#ec4899', '#6366f1'
                            ][idx % 8]
                          }}
                        />
                        {name.replace('_Mean', ' Mean')}
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center">Test</th>
                  <th className="px-3 py-2 text-right">Statistic</th>
                  <th className="px-3 py-2 text-right">P-Value</th>
                  <th className="px-3 py-2 text-center">Significant</th>
                </tr>
              </thead>
              <tbody>
                {statsResults.map((r, i) => (
                  <tr
                    key={i}
                    className={`
                      border-t border-slate-100
                      ${r.isSignificant ? 'bg-green-50' : ''}
                    `}
                  >
                    <td className="px-3 py-2 font-medium">{r.rowId}</td>
                    {groupNames.map(name => (
                      <td key={name} className="px-3 py-2 text-right font-mono">
                        {r.groupMeans[name] !== undefined
                          ? r.groupMeans[name].toFixed(4)
                          : 'N/A'}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">
                        {r.testType}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {isNaN(r.statistic) ? 'N/A' : r.statistic.toFixed(4)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {isNaN(r.pValue) ? 'N/A' : (r.pValue < 0.001 ? '<0.001' : r.pValue.toFixed(4))}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {r.isSignificant ? (
                        <span className="text-green-600 font-medium">O</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!outlierResult && !statsResults && !data && (
        <div className="text-center py-12 text-slate-500">
          No results yet. Run outlier detection or statistical analysis first.
        </div>
      )}
    </div>
  );
}
