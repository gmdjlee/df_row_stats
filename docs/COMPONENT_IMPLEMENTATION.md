# 컴포넌트 구현 가이드

## 메인 App 컴포넌트

### `src/App.tsx`
```typescript
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
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="text-2xl font-semibold text-slate-900">
          Statistical Analysis
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Outlier Detection & Row Statistics Analysis
        </p>
      </header>
      
      {/* Navigation */}
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
      
      {/* Main Content */}
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
```

---

## 데이터 입력 컴포넌트

### `src/components/DataInput.tsx`
```typescript
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { parseText, parseCSVFile, ParseConfig } from '../lib/utils/parser';
import { DataMatrix } from '../types';

interface Props {
  onLoad: (data: DataMatrix) => void;
}

export function DataInput({ onLoad }: Props) {
  const [text, setText] = useState('');
  const [config, setConfig] = useState<ParseConfig>({
    delimiter: 'auto',
    hasHeader: false,
    hasRowIndex: false
  });
  const [preview, setPreview] = useState<number[][] | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 파일 드롭 핸들러
  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    
    try {
      setError(null);
      if (file.name.endsWith('.csv')) {
        const result = await parseCSVFile(file);
        onLoad({
          data: result.data,
          headers: result.headers
        });
      } else {
        const content = await file.text();
        setText(content);
        handleParse(content);
      }
    } catch (e) {
      setError('Failed to parse file');
    }
  }, [onLoad]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.txt', '.tsv']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });
  
  // 텍스트 파싱
  const handleParse = (inputText?: string) => {
    try {
      setError(null);
      const result = parseText(inputText || text, config);
      setPreview(result.data.slice(0, 5));
    } catch (e) {
      setError('Invalid data format');
    }
  };
  
  // 데이터 로드
  const handleLoad = () => {
    try {
      const result = parseText(text, config);
      onLoad({
        data: result.data,
        headers: result.headers,
        rowIds: result.rowIds
      });
    } catch (e) {
      setError('Failed to load data');
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-slate-300 hover:border-slate-400'}
        `}
      >
        <input {...getInputProps()} />
        <div className="text-slate-600">
          <svg className="w-12 h-12 mx-auto mb-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="font-medium">Drop CSV/TXT file here</p>
          <p className="text-sm text-slate-500 mt-1">or click to select</p>
        </div>
      </div>
      
      {/* Text Input */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Or paste data directly:
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste tab-separated or comma-separated data..."
          className="w-full h-48 p-4 border border-slate-300 rounded-lg
            font-mono text-sm resize-none
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      {/* Config Options */}
      <div className="flex gap-6 items-center">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.hasHeader}
            onChange={(e) => setConfig({ ...config, hasHeader: e.target.checked })}
            className="rounded border-slate-300"
          />
          <span className="text-sm text-slate-700">First row is header</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.hasRowIndex}
            onChange={(e) => setConfig({ ...config, hasRowIndex: e.target.checked })}
            className="rounded border-slate-300"
          />
          <span className="text-sm text-slate-700">First column is row ID</span>
        </label>
        
        <select
          value={config.delimiter}
          onChange={(e) => setConfig({ ...config, delimiter: e.target.value as any })}
          className="px-3 py-1.5 border border-slate-300 rounded text-sm"
        >
          <option value="auto">Auto-detect delimiter</option>
          <option value="\t">Tab</option>
          <option value=",">Comma</option>
          <option value=" ">Space</option>
        </select>
      </div>
      
      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      
      {/* Preview */}
      {preview && (
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-2">
            Preview (first 5 rows):
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-slate-200 rounded">
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className={i % 2 ? 'bg-slate-50' : ''}>
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2 text-sm font-mono border-r last:border-r-0">
                        {isNaN(cell) ? <span className="text-red-500">NaN</span> : cell.toFixed(4)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={() => handleParse()}
          disabled={!text.trim()}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg
            hover:bg-slate-200 disabled:opacity-50"
        >
          Preview
        </button>
        <button
          onClick={handleLoad}
          disabled={!text.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg
            hover:bg-blue-700 disabled:opacity-50"
        >
          Load Data
        </button>
      </div>
    </div>
  );
}
```

---

## 이상치 탐지 컴포넌트

### `src/components/OutlierPanel.tsx`
```typescript
import { useState, useMemo } from 'react';
import { detectOutliers } from '../lib/outlier';
import { DataMatrix, OutlierConfig, OutlierMethod, OutlierResult } from '../types';
import { BoxPlotChart } from './visualization/BoxPlotChart';
import { OutlierTable } from './visualization/OutlierTable';

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
  
  // 데이터 요약
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
      {/* Data Summary */}
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
      
      {/* Method Selection */}
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
        
        {/* Parameters */}
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
      
      {/* Results */}
      {result && (
        <>
          {/* Result Summary */}
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
          </div>
          
          {/* Visualization */}
          <div className="grid grid-cols-2 gap-6">
            <BoxPlotChart data={data.data} outlierMask={result.outlierMask} />
            <OutlierTable 
              outlierIndices={result.outlierIndices} 
              data={data.data}
              rowIds={data.rowIds}
            />
          </div>
        </>
      )}
    </div>
  );
}
```

---

## 시각화 컴포넌트

### `src/components/visualization/BoxPlotChart.tsx`
```typescript
import { useMemo } from 'react';
import { ComposedChart, Bar, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { percentile, median, mean } from '../../lib/utils/math';

interface Props {
  data: number[][];
  outlierMask?: boolean[][];
}

export function BoxPlotChart({ data, outlierMask }: Props) {
  const chartData = useMemo(() => {
    return data.map((row, i) => {
      const clean = row.filter(x => !isNaN(x));
      const q1 = percentile(clean, 0.25);
      const q3 = percentile(clean, 0.75);
      const med = median(clean);
      const min = Math.min(...clean);
      const max = Math.max(...clean);
      
      // 이상치 값들
      const outliers = outlierMask 
        ? row.filter((_, j) => outlierMask[i]?.[j])
        : [];
      
      return {
        name: `Row ${i + 1}`,
        q1,
        q3,
        median: med,
        min,
        max,
        outliers,
        box: [q1, q3]
      };
    });
  }, [data, outlierMask]);
  
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="font-medium text-slate-900 mb-4">Distribution Overview</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData.slice(0, 20)} layout="vertical">
          <XAxis type="number" />
          <YAxis type="category" dataKey="name" width={60} />
          <Tooltip />
          <Bar dataKey="box" fill="#3b82f6" opacity={0.3} />
          <Scatter dataKey="outliers" fill="#ef4444" />
          <ReferenceLine x={0} stroke="#94a3b8" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### `src/components/visualization/OutlierTable.tsx`
```typescript
interface Props {
  outlierIndices: Array<[number, number]>;
  data: number[][];
  rowIds?: string[];
}

export function OutlierTable({ outlierIndices, data, rowIds }: Props) {
  const outlierData = outlierIndices.map(([row, col]) => ({
    rowIdx: row,
    colIdx: col,
    rowId: rowIds?.[row] || `Row ${row + 1}`,
    value: data[row][col]
  }));
  
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="font-medium text-slate-900 mb-4">
        Outlier Details ({outlierIndices.length})
      </h3>
      
      <div className="max-h-64 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left">Row</th>
              <th className="px-3 py-2 text-left">Column</th>
              <th className="px-3 py-2 text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {outlierData.map((item, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-3 py-2">{item.rowId}</td>
                <td className="px-3 py-2">Col {item.colIdx + 1}</td>
                <td className="px-3 py-2 text-right font-mono text-red-600">
                  {item.value.toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {outlierIndices.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          No outliers detected
        </div>
      )}
    </div>
  );
}
```

---

## 결과 패널 컴포넌트

### `src/components/ResultPanel.tsx`
```typescript
import { OutlierResult, StatsResult } from '../types';
import { StatsResultTable } from './visualization/StatsResultTable';

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
  };
  
  const significantCount = statsResults?.filter(r => r.isSignificant).length || 0;
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
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
      
      {/* Results Table */}
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
          <StatsResultTable results={statsResults} />
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
```

### `src/components/visualization/StatsResultTable.tsx`
```typescript
import { StatsResult } from '../../types';

interface Props {
  results: StatsResult[];
}

export function StatsResultTable({ results }: Props) {
  return (
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
          {results.map((r, i) => (
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
  );
}
```

---

## 의존성 설치

```bash
npm install react-dropzone recharts jstat lodash papaparse
npm install -D @types/lodash @types/papaparse
```

## 추가 참고사항

1. **react-dropzone** 대신 native HTML5 drag & drop API 사용 가능
2. **recharts** 대신 D3.js로 커스텀 Box Plot 구현 가능
3. **jstat** 대신 직접 통계 함수 구현 가능 (단, 분포 함수 필요)
