/**
 * Smart Logger Utility
 *
 * Features:
 * - Development mode only (no logs in production)
 * - Log levels (DEBUG, INFO, WARN, ERROR)
 * - Namespaced logging for different modules
 * - Performance measurement with timers
 * - Grouped logging for related operations
 * - Conditional logging
 * - Analysis result summaries
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

type LogData = unknown;

interface LoggerConfig {
  level: LogLevel;
  enabled: boolean;
  showTimestamp: boolean;
  showNamespace: boolean;
}

interface TimerEntry {
  start: number;
  label: string;
}

// Default configuration
const defaultConfig: LoggerConfig = {
  level: LogLevel.DEBUG,
  enabled: import.meta.env.DEV,
  showTimestamp: true,
  showNamespace: true
};

// Global configuration
let globalConfig: LoggerConfig = { ...defaultConfig };

// Active timers
const timers: Map<string, TimerEntry> = new Map();

// Level labels with colors
const LEVEL_LABELS: Record<LogLevel, { label: string; color: string }> = {
  [LogLevel.DEBUG]: { label: 'DEBUG', color: '#6B7280' },
  [LogLevel.INFO]: { label: 'INFO', color: '#3B82F6' },
  [LogLevel.WARN]: { label: 'WARN', color: '#F59E0B' },
  [LogLevel.ERROR]: { label: 'ERROR', color: '#EF4444' },
  [LogLevel.SILENT]: { label: '', color: '' }
};

// Namespace colors for visual distinction
const NAMESPACE_COLORS = [
  '#8B5CF6', // purple
  '#10B981', // green
  '#F97316', // orange
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
];

function getNamespaceColor(namespace: string): string {
  const hash = namespace.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return NAMESPACE_COLORS[hash % NAMESPACE_COLORS.length];
}

function formatTimestamp(): string {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${time}.${ms}`;
}

function formatPrefix(level: LogLevel, namespace: string): string[] {
  const parts: string[] = [];
  const styles: string[] = [];

  if (globalConfig.showTimestamp) {
    parts.push(`%c${formatTimestamp()}`);
    styles.push('color: #9CA3AF; font-weight: normal');
  }

  const levelInfo = LEVEL_LABELS[level];
  parts.push(`%c[${levelInfo.label}]`);
  styles.push(`color: ${levelInfo.color}; font-weight: bold`);

  if (globalConfig.showNamespace && namespace) {
    const nsColor = getNamespaceColor(namespace);
    parts.push(`%c[${namespace}]`);
    styles.push(`color: ${nsColor}; font-weight: bold`);
  }

  return [parts.join(' '), ...styles];
}

/**
 * Logger class for namespaced logging
 */
class Logger {
  private namespace: string;

  constructor(namespace: string) {
    this.namespace = namespace;
  }

  private shouldLog(level: LogLevel): boolean {
    return globalConfig.enabled && level >= globalConfig.level;
  }

  private log(level: LogLevel, message: string, ...data: LogData[]): void {
    if (!this.shouldLog(level)) return;

    const [prefix, ...styles] = formatPrefix(level, this.namespace);
    const method = level === LogLevel.ERROR ? 'error' :
                   level === LogLevel.WARN ? 'warn' :
                   level === LogLevel.INFO ? 'info' : 'log';

    if (data.length > 0) {
      console[method](prefix, ...styles, message, ...data);
    } else {
      console[method](prefix, ...styles, message);
    }
  }

  debug(message: string, ...data: LogData[]): void {
    this.log(LogLevel.DEBUG, message, ...data);
  }

  info(message: string, ...data: LogData[]): void {
    this.log(LogLevel.INFO, message, ...data);
  }

  warn(message: string, ...data: LogData[]): void {
    this.log(LogLevel.WARN, message, ...data);
  }

  error(message: string, ...data: LogData[]): void {
    this.log(LogLevel.ERROR, message, ...data);
  }

  /**
   * Start a timer for performance measurement
   */
  time(label: string): void {
    if (!globalConfig.enabled) return;
    const key = `${this.namespace}:${label}`;
    timers.set(key, { start: performance.now(), label });
    this.debug(`⏱️ Timer started: ${label}`);
  }

  /**
   * End a timer and log the duration
   */
  timeEnd(label: string): number {
    if (!globalConfig.enabled) return 0;
    const key = `${this.namespace}:${label}`;
    const entry = timers.get(key);

    if (!entry) {
      this.warn(`Timer "${label}" not found`);
      return 0;
    }

    const duration = performance.now() - entry.start;
    timers.delete(key);
    this.info(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  /**
   * Group related logs together
   */
  group(label: string): void {
    if (!globalConfig.enabled) return;
    const [prefix, ...styles] = formatPrefix(LogLevel.INFO, this.namespace);
    console.group(prefix, ...styles, `📁 ${label}`);
  }

  /**
   * End a log group
   */
  groupEnd(): void {
    if (!globalConfig.enabled) return;
    console.groupEnd();
  }

  /**
   * Collapsed group for less important details
   */
  groupCollapsed(label: string): void {
    if (!globalConfig.enabled) return;
    const [prefix, ...styles] = formatPrefix(LogLevel.DEBUG, this.namespace);
    console.groupCollapsed(prefix, ...styles, `📁 ${label}`);
  }

  /**
   * Log data in table format
   */
  table(data: LogData, columns?: string[]): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const [prefix, ...styles] = formatPrefix(LogLevel.DEBUG, this.namespace);
    console.log(prefix, ...styles, '📊 Table:');
    console.table(data, columns);
  }

  /**
   * Conditional logging - only logs if condition is true
   */
  assert(condition: boolean, message: string, ...data: LogData[]): void {
    if (!globalConfig.enabled || condition) return;
    this.error(`Assertion failed: ${message}`, ...data);
  }

  /**
   * Log object with expandable details
   */
  dir(obj: LogData, label?: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    if (label) this.debug(label);
    console.dir(obj, { depth: null, colors: true });
  }

  /**
   * Create a child logger with extended namespace
   */
  child(subNamespace: string): Logger {
    return new Logger(`${this.namespace}:${subNamespace}`);
  }
}

/**
 * Create a new logger with a namespace
 */
export function createLogger(namespace: string): Logger {
  return new Logger(namespace);
}

/**
 * Configure global logger settings
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  globalConfig = { ...globalConfig, ...config };
}

/**
 * Get current logger configuration
 */
export function getLoggerConfig(): LoggerConfig {
  return { ...globalConfig };
}

/**
 * Enable or disable logging
 */
export function setLoggerEnabled(enabled: boolean): void {
  globalConfig.enabled = enabled;
}

/**
 * Set minimum log level
 */
export function setLogLevel(level: LogLevel): void {
  globalConfig.level = level;
}

// Pre-configured loggers for common modules
export const appLogger = createLogger('App');
export const dataLogger = createLogger('Data');
export const outlierLogger = createLogger('Outlier');
export const statsLogger = createLogger('Stats');
export const parserLogger = createLogger('Parser');

// Analysis result logging helpers
export const logAnalysisSummary = {
  /**
   * Log outlier detection summary
   */
  outlier(result: {
    method: string;
    outlierCount: number;
    outlierRatio: number;
    bounds?: { lower: number; upper: number };
  }): void {
    if (!globalConfig.enabled) return;

    outlierLogger.group('Outlier Detection Summary');
    outlierLogger.info(`Method: ${result.method}`);
    outlierLogger.info(`Outliers found: ${result.outlierCount}`);
    outlierLogger.info(`Outlier ratio: ${(result.outlierRatio * 100).toFixed(2)}%`);
    if (result.bounds) {
      outlierLogger.debug(`Bounds: [${result.bounds.lower.toFixed(4)}, ${result.bounds.upper.toFixed(4)}]`);
    }
    outlierLogger.groupEnd();
  },

  /**
   * Log statistics analysis summary
   */
  stats(results: Array<{
    rowId: string;
    testType: string;
    pValue: number;
    isSignificant: boolean;
  }>): void {
    if (!globalConfig.enabled) return;

    const significantCount = results.filter(r => r.isSignificant).length;

    statsLogger.group('Statistical Analysis Summary');
    statsLogger.info(`Total rows analyzed: ${results.length}`);
    statsLogger.info(`Significant results: ${significantCount} (${((significantCount / results.length) * 100).toFixed(1)}%)`);

    if (results.length <= 10) {
      statsLogger.groupCollapsed('Detailed Results');
      results.forEach(r => {
        const marker = r.isSignificant ? '✅' : '❌';
        statsLogger.debug(`${marker} ${r.rowId}: ${r.testType}, p=${r.pValue.toFixed(4)}`);
      });
      statsLogger.groupEnd();
    }

    statsLogger.groupEnd();
  },

  /**
   * Log data loading summary
   */
  dataLoad(matrix: {
    rows: number;
    cols: number;
    hasHeaders?: boolean;
    hasRowIds?: boolean;
  }): void {
    if (!globalConfig.enabled) return;

    dataLogger.group('Data Load Summary');
    dataLogger.info(`Matrix size: ${matrix.rows} rows × ${matrix.cols} columns`);
    dataLogger.debug(`Has headers: ${matrix.hasHeaders ? 'Yes' : 'No'}`);
    dataLogger.debug(`Has row IDs: ${matrix.hasRowIds ? 'Yes' : 'No'}`);
    dataLogger.groupEnd();
  }
};

export { Logger, LogLevel as Level };
