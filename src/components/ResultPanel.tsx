import { OutlierResult, StatsResult } from '../types';

interface Props {
  outlierResult: OutlierResult | null;
  statsResults: StatsResult[] | null;
}

export function ResultPanel({ outlierResult, statsResults }: Props) {
  const handleExportCSV = () => {
    if (!statsResults) return;

    const headers = ['Row_ID', 'Group1_Mean', 'Group2_Mean', 'Test_Type',
                     'Statistic', 'P_Value', 'Significant'];
    const rows = statsResults.map(r => [
      r.rowId,
      r.groupMeans['Group1_Mean']?.toFixed(4) || '',
      r.groupMeans['Group2_Mean']?.toFixed(4) || '',
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

  const significantCount = statsResults?.filter(r => r.isSignificant).length || 0;

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

      {statsResults && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-slate-900">Statistical Analysis Results</h3>
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
                  <th className="px-3 py-2 text-right">Group 1 Mean</th>
                  <th className="px-3 py-2 text-right">Group 2 Mean</th>
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
                    <td className="px-3 py-2 text-right font-mono">
                      {r.groupMeans['Group1_Mean']?.toFixed(4) || 'N/A'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.groupMeans['Group2_Mean']?.toFixed(4) || 'N/A'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">
                        {r.testType}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.statistic.toFixed(4)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.pValue < 0.001 ? '<0.001' : r.pValue.toFixed(4)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {r.isSignificant ? (
                        <span className="text-green-600 font-medium">✓</span>
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

      {!outlierResult && !statsResults && (
        <div className="text-center py-12 text-slate-500">
          No results yet. Run outlier detection or statistical analysis first.
        </div>
      )}
    </div>
  );
}
