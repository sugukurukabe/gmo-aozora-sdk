export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE_KEYS = new Set([
  'accesstoken',
  'refreshtoken',
  'clientsecret',
  'code',
  'codeverifier',
  'authorization',
  'x-access-token',
]);

/**
 * Redact known secret keys from log metadata (shallow, key-based only).
 * Callers must still avoid putting secrets in `meta` in production.
 */
export function redactLogMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (meta === undefined) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : v;
  }
  return out;
}

export interface Logger {
  log(level: LogLevel, message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

abstract class BaseLogger implements Logger {
  abstract log(level: LogLevel, message: string, meta?: Record<string, unknown>): void;

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }
  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }
  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }
  error(message: string, meta?: Record<string, unknown>): void {
    this.log('error', message, meta);
  }
}

/**
 * Console-based logger. For development only — never use in production
 * as it may leak PII in request metadata. Sensitive keys in `meta` are redacted.
 */
export class ConsoleLogger extends BaseLogger {
  log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const safe = redactLogMeta(meta);
    const entry = safe ? `${message} ${JSON.stringify(safe)}` : message;
    if (level === 'error') {
      console.error(`[${level.toUpperCase()}] ${entry}`);
    } else if (level === 'warn') {
      console.warn(`[${level.toUpperCase()}] ${entry}`);
    } else {
      console.log(`[${level.toUpperCase()}] ${entry}`);
    }
  }
}

/** No-op logger for tests. */
export class NoopLogger extends BaseLogger {
  log(_level: LogLevel, _message: string, _meta?: Record<string, unknown>): void {
    // intentionally silent
  }
}
