import { useState, useCallback } from 'react';
import { DataInput } from './components/DataInput';
import { OutlierPanel } from './components/OutlierPanel';
import { StatsPanel } from './components/StatsPanel';
import { ResultPanel } from './components/ResultPanel';
import { DataMatrix, OutlierResult, StatsResult } from './types';

type Tab = 'input' | 'outlier' | 'stats' | 'results';

export default function App() {
  const [tab, setTab] = useState<Tab>('input');
  const [data, setData] = useState<DataMatrix | null>(null);
  const [cleanedData, setCleanedData] = useState<DataMatrix | null>(null);
  const [outlierResult, setOutlierResult] = useState<OutlierResult | null>(null);
  const [statsResults, setStatsResults] = useState<StatsResult[] | null>(null);

  const handleDataLoad = useCallback((matrix: DataMatrix) => {
    setData(matrix);
    setCleanedData(null);
    setOutlierResult(null);
    setStatsResults(null);
    setTab('outlier');
  }, []);

  const handleOutlierDetect = useCallback((result: OutlierResult) => {
    setOutlierResult(result);
    if (data) {
      setCleanedData({
        ...data,
        data: result.cleanedData
      });
    }
  }, [data]);

  const handleStatsAnalyze = useCallback((results: StatsResult[]) => {
    setStatsResults(results);
    setTab('results');
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="text-2xl font-semibold text-slate-900">
          Statistical Analysis
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Outlier Detection & Row Statistics Analysis
        </p>
      </header>

      <nav className="bg-white border-b border-slate-200">
        <div className="flex gap-1 px-6">
          {(['input', 'outlier', 'stats', 'results'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              disabled={t !== 'input' && !data}
              className={`
                px-4 py-3 text-sm font-medium capitalize
                border-b-2 transition-colors
                ${tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'}
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {t === 'input' ? 'Data Input' :
               t === 'outlier' ? 'Outlier Detection' :
               t === 'stats' ? 'Statistical Analysis' : 'Results'}
            </button>
          ))}
        </div>
      </nav>

      <main className="p-6">
        {tab === 'input' && (
          <DataInput onLoad={handleDataLoad} />
        )}
        {tab === 'outlier' && data && (
          <OutlierPanel
            data={data}
            onDetect={handleOutlierDetect}
            result={outlierResult}
          />
        )}
        {tab === 'stats' && (
          <StatsPanel
            data={cleanedData || data}
            onAnalyze={handleStatsAnalyze}
          />
        )}
        {tab === 'results' && (
          <ResultPanel
            outlierResult={outlierResult}
            statsResults={statsResults}
          />
        )}
      </main>
    </div>
  );
}
