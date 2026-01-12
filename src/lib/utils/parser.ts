import Papa from 'papaparse';
import { parserLogger, logAnalysisSummary } from './logger';

export interface ParseConfig {
  delimiter?: 'auto' | '\t' | ',' | ' ';
  hasHeader?: boolean;
  hasRowIndex?: boolean;
}

/**
 * 구분자 자동 감지
 */
export function detectDelimiter(text: string): string {
  const firstLine = text.split('\n')[0];
  const counts: Record<string, number> = { '\t': 0, ',': 0, ' ': 0 };

  for (const char of firstLine) {
    if (char in counts) counts[char]++;
  }

  const delimiter = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])[0][0];

  const delimiterName = delimiter === '\t' ? 'tab' : delimiter === ',' ? 'comma' : 'space';
  parserLogger.debug(`Auto-detected delimiter: ${delimiterName} (count: ${counts[delimiter]})`);

  return delimiter;
}

/**
 * 텍스트 파싱
 */
export function parseText(
  text: string,
  config: ParseConfig = {}
): { data: number[][]; headers?: string[]; rowIds?: string[] } {
  parserLogger.time('text-parsing');
  parserLogger.info('Parsing text data');

  const delimiter = config.delimiter === 'auto'
    ? detectDelimiter(text)
    : config.delimiter || '\t';

  const lines = text.trim().split('\n');
  let headers: string[] | undefined;
  let startIdx = 0;

  if (config.hasHeader) {
    headers = lines[0].split(delimiter).map(h => h.trim());
    startIdx = 1;
    parserLogger.debug(`Headers: ${headers.join(', ')}`);
  }

  const rowIds: string[] = [];
  const data: number[][] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const cells = lines[i].split(delimiter);

    if (config.hasRowIndex) {
      rowIds.push(cells[0].trim());
      data.push(cells.slice(1).map(c => parseFloat(c.trim())));
    } else {
      rowIds.push(`Row_${i - startIdx + 1}`);
      data.push(cells.map(c => parseFloat(c.trim())));
    }
  }

  parserLogger.timeEnd('text-parsing');
  logAnalysisSummary.dataLoad({
    rows: data.length,
    cols: data[0]?.length || 0,
    hasHeaders: !!headers,
    hasRowIds: config.hasRowIndex
  });

  return { data, headers, rowIds };
}

/**
 * CSV 파일 파싱
 */
export function parseCSVFile(file: File): Promise<{ data: number[][]; headers?: string[] }> {
  parserLogger.time('csv-parsing');
  parserLogger.info(`Parsing CSV file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (result) => {
        const rows = result.data as string[][];
        const headers = rows[0];
        const data = rows.slice(1).map(row =>
          row.map(cell => parseFloat(cell) || NaN)
        );

        parserLogger.timeEnd('csv-parsing');
        logAnalysisSummary.dataLoad({
          rows: data.length,
          cols: data[0]?.length || 0,
          hasHeaders: true,
          hasRowIds: false
        });

        resolve({ data, headers });
      },
      error: (error) => {
        parserLogger.error('CSV parsing failed:', error);
        reject(error);
      }
    });
  });
}
