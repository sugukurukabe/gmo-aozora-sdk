import { describe, it, expect, vi, afterEach } from 'vitest';
import { ConsoleLogger, redactLogMeta } from '../logger.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('redactLogMeta', () => {
  it('redacts accessToken value', () => {
    const out = redactLogMeta({ accessToken: 'secret', foo: 'bar' });
    expect(out?.accessToken).toBe('[REDACTED]');
    expect(out?.foo).toBe('bar');
  });

  it('matches sensitive keys case-insensitively', () => {
    const out = redactLogMeta({ RefreshToken: 'rt', normal: 'ok' });
    expect(out?.RefreshToken).toBe('[REDACTED]');
    expect(out?.normal).toBe('ok');
  });

  it('returns undefined for undefined input', () => {
    expect(redactLogMeta(undefined)).toBeUndefined();
  });
});

describe('ConsoleLogger', () => {
  it('does not print raw accessToken in output', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new ConsoleLogger();
    logger.info('hello', { accessToken: 'super-secret', requestId: 'req-1' });
    const printed = logSpy.mock.calls[0]?.[0] as string;
    expect(printed).toContain('[REDACTED]');
    expect(printed).not.toContain('super-secret');
    expect(printed).toContain('req-1');
  });
});
