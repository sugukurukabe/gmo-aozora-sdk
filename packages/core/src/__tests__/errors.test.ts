import { describe, it, expect } from 'vitest';
import {
  GmoAozoraError,
  GmoAozoraAuthError,
  GmoAozoraStateMismatchError,
  GmoAozoraApiError,
  GmoAozoraValidationError,
  GmoAozoraServerError,
  GmoAozoraTimeoutError,
} from '../errors/index.js';

describe('GmoAozoraError (base)', () => {
  it('carries code and message', () => {
    const e = new GmoAozoraError({ code: 'TEST', message: 'test error' });
    expect(e.code).toBe('TEST');
    expect(e.message).toBe('test error');
    expect(e.name).toBe('GmoAozoraError');
  });

  it('carries optional requestId', () => {
    const e = new GmoAozoraError({ code: 'X', message: 'x', requestId: 'req-123' });
    expect(e.requestId).toBe('req-123');
  });

  it('is instanceof Error', () => {
    const e = new GmoAozoraError({ code: 'X', message: 'x' });
    expect(e).toBeInstanceOf(Error);
  });
});

describe('GmoAozoraAuthError', () => {
  it('is instanceof GmoAozoraError and GmoAozoraAuthError', () => {
    const e = new GmoAozoraAuthError({ code: 'TOKEN_ERROR', message: 'auth failed' });
    expect(e).toBeInstanceOf(GmoAozoraError);
    expect(e).toBeInstanceOf(GmoAozoraAuthError);
    expect(e.name).toBe('GmoAozoraAuthError');
  });

  it('is NOT instanceof GmoAozoraApiError', () => {
    const e = new GmoAozoraAuthError({ code: 'X', message: 'x' });
    expect(e).not.toBeInstanceOf(GmoAozoraApiError);
  });
});

describe('GmoAozoraStateMismatchError', () => {
  it('has STATE_MISMATCH code by default', () => {
    const e = new GmoAozoraStateMismatchError();
    expect(e.code).toBe('STATE_MISMATCH');
    expect(e.name).toBe('GmoAozoraStateMismatchError');
  });

  it('is instanceof GmoAozoraAuthError', () => {
    const e = new GmoAozoraStateMismatchError();
    expect(e).toBeInstanceOf(GmoAozoraAuthError);
    expect(e).toBeInstanceOf(GmoAozoraError);
  });

  it('accepts custom message', () => {
    const e = new GmoAozoraStateMismatchError({ message: 'custom' });
    expect(e.message).toBe('custom');
  });
});

describe('GmoAozoraApiError', () => {
  it('carries status code', () => {
    const e = new GmoAozoraApiError({ code: 'NOT_FOUND', message: 'not found', status: 404 });
    expect(e.status).toBe(404);
    expect(e.code).toBe('NOT_FOUND');
    expect(e.name).toBe('GmoAozoraApiError');
  });

  it('is instanceof GmoAozoraError', () => {
    const e = new GmoAozoraApiError({ code: 'X', message: 'x', status: 400 });
    expect(e).toBeInstanceOf(GmoAozoraError);
  });
});

describe('GmoAozoraValidationError', () => {
  it('has RESPONSE_PARSE_FAILED code', () => {
    const e = new GmoAozoraValidationError({ message: 'invalid response' });
    expect(e.code).toBe('RESPONSE_PARSE_FAILED');
    expect(e.name).toBe('GmoAozoraValidationError');
  });

  it('carries issues', () => {
    const issues = [{ path: ['amount'], message: 'expected string' }];
    const e = new GmoAozoraValidationError({ message: 'parse failed', issues });
    expect(e.issues).toEqual(issues);
  });

  it('is instanceof GmoAozoraError', () => {
    const e = new GmoAozoraValidationError({ message: 'x' });
    expect(e).toBeInstanceOf(GmoAozoraError);
  });
});

describe('GmoAozoraServerError', () => {
  it('has SERVER_ERROR code and inherits from GmoAozoraApiError', () => {
    const e = new GmoAozoraServerError({ status: 503, message: 'service unavailable' });
    expect(e.code).toBe('SERVER_ERROR');
    expect(e.status).toBe(503);
    expect(e.name).toBe('GmoAozoraServerError');
    expect(e).toBeInstanceOf(GmoAozoraApiError);
    expect(e).toBeInstanceOf(GmoAozoraError);
  });
});

describe('GmoAozoraTimeoutError', () => {
  it('has TIMEOUT code by default', () => {
    const e = new GmoAozoraTimeoutError({});
    expect(e.code).toBe('TIMEOUT');
    expect(e.name).toBe('GmoAozoraTimeoutError');
    expect(e).toBeInstanceOf(GmoAozoraError);
  });

  it('accepts custom message', () => {
    const e = new GmoAozoraTimeoutError({ message: 'bulk transfer timed out' });
    expect(e.message).toBe('bulk transfer timed out');
  });
});
