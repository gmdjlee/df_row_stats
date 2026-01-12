import { useState, useCallback, useMemo, useEffect } from 'react';
import { DataInput } from './components/DataInput';
import { OutlierPanel } from './components/OutlierPanel';
import { StatsPanel } from './components/StatsPanel';
import { ResultPanel } from './components/ResultPanel';
import { ExplanationPanel } from './components/ExplanationPanel';
import { DataMatrix, OutlierResult, StatsResult, NormalizeMode } from './types';
import { applyNormalization } from './lib/utils/normalize';
import { appLogger, dataLogger } from './lib/utils/logger';

type Tab = 'input' | 'outlier' | 'stats' | 'results' | 'explanation';

export default function App() {
  const [tab, setTab] = useState<Tab>('input');
  const [data, setData] = useState<DataMatrix | null>(null);
  const [cleanedData, setCleanedData] = useState<DataMatrix | null>(null);
  const [outlierResult, setOutlierResult] = useState<OutlierResult | null>(null);
  const [statsResults, setStatsResults] = useState<StatsResult[] | null>(null);
  const [normalizeMode, setNormalizeMode] = useState<NormalizeMode>('none');

  // Log app initialization
  useEffect(() => {
    appLogger.info('Statistical Analysis App initialized');
    appLogger.debug('Environment:', import.meta.env.MODE);
  }, []);

  // Log tab changes
  useEffect(() => {
    appLogger.debug(`Tab changed to: ${tab}`);
  }, [tab]);

  // Apply normalization to data when normalizeMode changes
  const normalizedData = useMemo(() => {
    if (!data) return null;
    return {
      ...data,
      data: applyNormalization(data.data, normalizeMode)
    };
  }, [data, normalizeMode]);

  // Apply normalization to cleaned data
  const normalizedCleanedData = useMemo(() => {
    if (!cleanedData) return null;
    return {
      ...cleanedData,
      data: applyNormalization(cleanedData.data, normalizeMode)
    };
  }, [cleanedData, normalizeMode]);

  const handleDataLoad = useCallback((matrix: DataMatrix, mode: NormalizeMode) => {
    dataLogger.group('Data Load');
    dataLogger.info(`Data loaded: ${matrix.data.length} rows × ${matrix.data[0]?.length || 0} columns`);
    dataLogger.debug('Normalization mode:', mode);
    dataLogger.groupEnd();

    setData(matrix);
    setNormalizeMode(mode);
    setCleanedData(null);
    setOutlierResult(null);
    setStatsResults(null);
    setTab('outlier');
  }, []);

  const handleOutlierDetect = useCallback((result: OutlierResult) => {
    appLogger.info('Outlier detection completed');
    setOutlierResult(result);
    if (data) {
      setCleanedData({
        ...data,
        data: result.cleanedData
      });
    }
  }, [data]);

  const handleStatsAnalyze = useCallback((results: StatsResult[]) => {
    appLogger.info('Statistical analysis completed');
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
          {(['input', 'outlier', 'stats', 'results', 'explanation'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              disabled={t !== 'input' && t !== 'explanation' && !data}
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
               t === 'stats' ? 'Statistical Analysis' :
               t === 'results' ? 'Results' : 'Guide'}
            </button>
          ))}
        </div>
      </nav>

      <main className="p-6">
        {tab === 'input' && (
          <DataInput onLoad={handleDataLoad} />
        )}
        {tab === 'outlier' && normalizedData && (
          <OutlierPanel
            data={normalizedData}
            onDetect={handleOutlierDetect}
            result={outlierResult}
            normalizeMode={normalizeMode}
          />
        )}
        {tab === 'stats' && (
          <StatsPanel
            data={normalizedCleanedData || normalizedData}
            onAnalyze={handleStatsAnalyze}
            normalizeMode={normalizeMode}
          />
        )}
        {tab === 'results' && (
          <ResultPanel
            outlierResult={outlierResult}
            statsResults={statsResults}
            data={normalizedCleanedData || normalizedData}
            normalizeMode={normalizeMode}
          />
        )}
        {tab === 'explanation' && (
          <ExplanationPanel />
        )}
      </main>
    </div>
  );
}
