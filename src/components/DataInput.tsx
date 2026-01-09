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
    } catch {
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
    maxSize: 10 * 1024 * 1024
  });

  const handleParse = (inputText?: string) => {
    try {
      setError(null);
      const result = parseText(inputText || text, config);
      setPreview(result.data.slice(0, 5));
    } catch {
      setError('Invalid data format');
    }
  };

  const handleLoad = () => {
    try {
      const result = parseText(text, config);
      onLoad({
        data: result.data,
        headers: result.headers,
        rowIds: result.rowIds
      });
    } catch {
      setError('Failed to load data');
    }
  };

  return (
    <div className="space-y-6">
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
          <p className="font-medium">Drop CSV/TXT file here</p>
          <p className="text-sm text-slate-500 mt-1">or click to select</p>
        </div>
      </div>

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
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

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
