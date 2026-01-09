import { useState, useMemo } from 'react';
import { DataMatrix, StatsResult, StatsConfig, NormalizeMode } from '../types';
import { analyzeRows } from '../lib/statistics';

interface Props {
  data: DataMatrix | null;
  onAnalyze: (results: StatsResult[]) => void;
  normalizeMode: NormalizeMode;
}

// Group color palette - distinct colors for easy differentiation
const GROUP_COLORS = [
  { name: 'Blue', bg: 'bg-blue-500', bgLight: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-700', hex: '#3b82f6' },
  { name: 'Red', bg: 'bg-red-500', bgLight: 'bg-red-100', border: 'border-red-500', text: 'text-red-700', hex: '#ef4444' },
  { name: 'Green', bg: 'bg-green-500', bgLight: 'bg-green-100', border: 'border-green-500', text: 'text-green-700', hex: '#22c55e' },
  { name: 'Purple', bg: 'bg-purple-500', bgLight: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-700', hex: '#a855f7' },
  { name: 'Orange', bg: 'bg-orange-500', bgLight: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-700', hex: '#f97316' },
  { name: 'Teal', bg: 'bg-teal-500', bgLight: 'bg-teal-100', border: 'border-teal-500', text: 'text-teal-700', hex: '#14b8a6' },
  { name: 'Pink', bg: 'bg-pink-500', bgLight: 'bg-pink-100', border: 'border-pink-500', text: 'text-pink-700', hex: '#ec4899' },
  { name: 'Indigo', bg: 'bg-indigo-500', bgLight: 'bg-indigo-100', border: 'border-indigo-500', text: 'text-indigo-700', hex: '#6366f1' },
];

const NORMALIZE_LABELS: Record<NormalizeMode, string> = {
  'none': 'Original',
  'sign': 'Sign Normalized',
  'absolute': 'Absolute Value'
};

interface GroupAssignment {
  [colIndex: number]: number | null; // column index -> group index (null = unassigned)
}

export function StatsPanel({ data, onAnalyze, normalizeMode }: Props) {
  const [groupCount, setGroupCount] = useState(2);
  const [columnGroups, setColumnGroups] = useState<GroupAssignment>({});
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
  const [alpha, setAlpha] = useState(0.05);

  const numCols = useMemo(() => data?.data[0]?.length || 0, [data]);
  const numRows = useMemo(() => data?.data.length || 0, [data]);

  // Get columns for each group
  const groupColumns = useMemo(() => {
    const groups: number[][] = Array.from({ length: groupCount }, () => []);
    Object.entries(columnGroups).forEach(([colStr, groupIdx]) => {
      const col = parseInt(colStr);
      if (groupIdx !== null && groupIdx < groupCount) {
        groups[groupIdx].push(col);
      }
    });
    // Sort columns within each group
    groups.forEach(g => g.sort((a, b) => a - b));
    return groups;
  }, [columnGroups, groupCount]);

  // Check if analysis can run (at least 2 groups with data)
  const canAnalyze = useMemo(() => {
    const nonEmptyGroups = groupColumns.filter(g => g.length > 0);
    return nonEmptyGroups.length >= 2;
  }, [groupColumns]);

  if (!data) {
    return (
      <div className="text-center py-12 text-slate-500">
        Please load data first
      </div>
    );
  }

  const handleColumnClick = (colIndex: number) => {
    setColumnGroups(prev => {
      const currentGroup = prev[colIndex];
      // If already in the selected group, unassign
      if (currentGroup === selectedGroupIndex) {
        const { [colIndex]: _, ...rest } = prev;
        return rest;
      }
      // Assign to selected group
      return { ...prev, [colIndex]: selectedGroupIndex };
    });
  };

  const handleAddGroup = () => {
    if (groupCount < GROUP_COLORS.length) {
      setGroupCount(prev => prev + 1);
    }
  };

  const handleRemoveGroup = () => {
    if (groupCount > 2) {
      // Remove assignments for the last group
      const newGroupCount = groupCount - 1;
      setColumnGroups(prev => {
        const updated: GroupAssignment = {};
        Object.entries(prev).forEach(([col, group]) => {
          if (group !== null && group < newGroupCount) {
            updated[parseInt(col)] = group;
          }
        });
        return updated;
      });
      setGroupCount(newGroupCount);
      if (selectedGroupIndex >= newGroupCount) {
        setSelectedGroupIndex(newGroupCount - 1);
      }
    }
  };

  const handleClearAll = () => {
    setColumnGroups({});
  };

  const handleAnalyze = () => {
    if (!data || !canAnalyze) return;

    // Build dataframes for each group
    const activeGroups = groupColumns.filter(cols => cols.length > 0);

    // Transform data: [group][row][col within group]
    const dataframes = activeGroups.map(cols =>
      data.data.map(row => cols.map(col => row[col]))
    );

    const rowIds = data.rowIds || data.data.map((_, i) => `Row ${i + 1}`);

    const config: StatsConfig = {
      alpha,
      minSamples: 2
    };

    const results = analyzeRows(dataframes, rowIds, config);

    // Update group means labels with actual group names
    const groupLabels = groupColumns
      .map((cols, idx) => cols.length > 0 ? `Group ${idx + 1}` : null)
      .filter(Boolean);

    const updatedResults = results.map(result => {
      const newGroupMeans: Record<string, number> = {};
      Object.keys(result.groupMeans).forEach((key, idx) => {
        if (groupLabels[idx]) {
          newGroupMeans[`${groupLabels[idx]}_Mean`] = result.groupMeans[key];
        }
      });
      return { ...result, groupMeans: newGroupMeans };
    });

    onAnalyze(updatedResults);
  };

  // Get color class for a column
  const getColumnColorClass = (colIndex: number) => {
    const groupIdx = columnGroups[colIndex];
    if (groupIdx === undefined || groupIdx === null) return '';
    return GROUP_COLORS[groupIdx]?.bgLight || '';
  };

  const getColumnHeaderClass = (colIndex: number) => {
    const groupIdx = columnGroups[colIndex];
    if (groupIdx === undefined || groupIdx === null) return 'bg-slate-100';
    return `${GROUP_COLORS[groupIdx]?.bg} text-white`;
  };

  return (
    <div className="space-y-6">
      {/* Data Info */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="font-medium text-slate-900 mb-3">Data Info</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Rows: </span>
            <span className="font-medium">{numRows}</span>
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

      {/* Group Configuration */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="font-medium text-slate-900 mb-3">Group Configuration</h3>
        <p className="text-sm text-slate-600 mb-4">
          Click on column headers in the table below to assign columns to groups.
          Select a group color first, then click columns to assign them.
        </p>

        {/* Group Color Selection */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-sm text-slate-700">Select group:</span>
          {Array.from({ length: groupCount }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedGroupIndex(idx)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all
                ${selectedGroupIndex === idx
                  ? `${GROUP_COLORS[idx].border} ${GROUP_COLORS[idx].bgLight}`
                  : 'border-slate-200 hover:border-slate-300'}
              `}
            >
              <span
                className={`w-4 h-4 rounded ${GROUP_COLORS[idx].bg}`}
              />
              <span className={`text-sm font-medium ${GROUP_COLORS[idx].text}`}>
                Group {idx + 1}
              </span>
              <span className="text-xs text-slate-500">
                ({groupColumns[idx]?.length || 0} cols)
              </span>
            </button>
          ))}

          {/* Add/Remove Group buttons */}
          <div className="flex gap-2 ml-2">
            {groupCount < GROUP_COLORS.length && (
              <button
                onClick={handleAddGroup}
                className="px-2 py-1.5 text-sm rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                title="Add Group"
              >
                + Add
              </button>
            )}
            {groupCount > 2 && (
              <button
                onClick={handleRemoveGroup}
                className="px-2 py-1.5 text-sm rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                title="Remove Last Group"
              >
                - Remove
              </button>
            )}
            <button
              onClick={handleClearAll}
              className="px-2 py-1.5 text-sm rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
              title="Clear All Assignments"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Group Summary */}
        <div className="flex flex-wrap gap-4 mb-4 p-3 bg-slate-50 rounded-lg">
          {groupColumns.map((cols, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded ${GROUP_COLORS[idx].bg}`} />
              <span className="text-sm">
                <span className={`font-medium ${GROUP_COLORS[idx].text}`}>Group {idx + 1}:</span>
                <span className="text-slate-600 ml-1">
                  {cols.length > 0
                    ? `Cols ${cols.map(c => c + 1).join(', ')}`
                    : 'No columns'}
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* Significance Level */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <span className="text-sm text-slate-700">Significance level (α):</span>
            <select
              value={alpha}
              onChange={(e) => setAlpha(parseFloat(e.target.value))}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
            >
              <option value={0.01}>0.01</option>
              <option value={0.05}>0.05</option>
              <option value={0.10}>0.10</option>
            </select>
          </label>

          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className={`
              px-6 py-2 rounded-lg font-medium transition-colors
              ${canAnalyze
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
            `}
          >
            Run Analysis
          </button>

          {!canAnalyze && (
            <span className="text-sm text-amber-600">
              Assign columns to at least 2 groups
            </span>
          )}
        </div>
      </div>

      {/* Data Table with Clickable Headers */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="font-medium text-slate-900 mb-3">
          Data Table
          <span className="ml-2 text-sm font-normal text-slate-500">
            (Click column headers to assign groups)
          </span>
        </h3>
        <div className="overflow-x-auto">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 bg-slate-200 text-left font-medium text-slate-700 border-b border-slate-300">
                    Row
                  </th>
                  {Array.from({ length: numCols }).map((_, colIdx) => {
                    const groupIdx = columnGroups[colIdx];
                    const isAssigned = groupIdx !== undefined && groupIdx !== null;
                    return (
                      <th
                        key={colIdx}
                        onClick={() => handleColumnClick(colIdx)}
                        className={`
                          px-3 py-2 text-center font-medium cursor-pointer transition-colors
                          border-b border-slate-300
                          ${getColumnHeaderClass(colIdx)}
                          ${!isAssigned ? 'hover:bg-slate-200' : 'hover:opacity-80'}
                        `}
                        title={isAssigned
                          ? `Group ${groupIdx + 1} - Click to unassign`
                          : `Click to assign to Group ${selectedGroupIndex + 1}`}
                      >
                        <div className="flex flex-col items-center">
                          <span>{data.headers?.[colIdx] || `Col ${colIdx + 1}`}</span>
                          {isAssigned && (
                            <span className="text-xs opacity-75">
                              (G{groupIdx + 1})
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {data.data.slice(0, 50).map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-700 bg-slate-50">
                      {data.rowIds?.[rowIdx] || `Row ${rowIdx + 1}`}
                    </td>
                    {row.map((val, colIdx) => (
                      <td
                        key={colIdx}
                        className={`px-3 py-2 text-center font-mono ${getColumnColorClass(colIdx)}`}
                      >
                        {isNaN(val) ? '-' : val.toFixed(4)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {numRows > 50 && (
            <div className="text-center py-2 text-sm text-slate-500 bg-slate-50 border-t">
              Showing first 50 of {numRows} rows
            </div>
          )}
        </div>
      </div>

      {/* Analysis Info */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="font-medium text-slate-900 mb-2">Analysis Info</h3>
        <ul className="text-sm text-slate-600 space-y-1">
          <li>• <strong>2 groups:</strong> T-test (or Welch's T-test if variances differ)</li>
          <li>• <strong>3+ groups:</strong> One-way ANOVA</li>
          <li>• Levene's test checks for equal variances before T-test</li>
          <li>• Each row is analyzed independently</li>
        </ul>
      </div>
    </div>
  );
}
