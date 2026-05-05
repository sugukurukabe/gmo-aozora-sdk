import { describe, it, expect, vi, afterEach } from 'vitest';
import { z } from 'zod';
import { HttpClient } from '../client.js';
import {
  GmoAozoraApiError,
  GmoAozoraAuthError,
  GmoAozoraServerError,
  GmoAozoraTimeoutError,
  GmoAozoraValidationError,
} from '../../errors/index.js';
import type { TokenSet } from '../../storage/index.js';

function makeTokenSet(): TokenSet {
  return {
    accessToken: 'access-tok',
    refreshToken: 'refresh-tok',
    expiresAt: Date.now() + 3600_000,
    tokenType: 'Bearer',
    scope: 'private:account',
  };
}

function makeClient(overrides?: {
  getAccessToken?: () => Promise<string>;
  refreshTokens?: () => Promise<TokenSet>;
  maxRetries?: number;
  timeoutMs?: number;
}) {
  const cfg: ConstructorParameters<typeof HttpClient>[0] = {
    baseUrl: 'https://sandbox.example.com',
    getAccessToken: overrides?.getAccessToken ?? (() => Promise.resolve('tok')),
    refreshTokens: overrides?.refreshTokens ?? (() => Promise.resolve(makeTokenSet())),
    maxRetries: overrides?.maxRetries ?? 0,
  };
  if (overrides?.timeoutMs !== undefined) cfg.timeoutMs = overrides.timeoutMs;
  return new HttpClient(cfg);
}

function mockFetch(status: number, body: unknown, headers?: Record<string, string>) {
  return vi.spyOn(global, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...headers },
    }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

const SimpleSchema = z.object({ id: z.string() }).strict();

describe('HttpClient.get — success', () => {
  it('returns parsed response on 200', async () => {
    mockFetch(200, { id: 'abc' });
    const client = makeClient();
    const result = await client.get('/accounts', { schema: SimpleSchema });
    expect(result.id).toBe('abc');
  });

  it('appends query params to URL', async () => {
    const spy = mockFetch(200, { id: 'x' });
    const client = makeClient();
    await client.get('/accounts', { schema: SimpleSchema, query: { accountId: '001' } });
    const calledUrl = spy.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('accountId=001');
  });

  it('throws GmoAozoraValidationError on schema mismatch', async () => {
    mockFetch(200, { id: 123 }); // id should be string
    const client = makeClient();
    await expect(client.get('/accounts', { schema: SimpleSchema })).rejects.toBeInstanceOf(
      GmoAozoraValidationError,
    );
  });
});

describe('HttpClient — error responses', () => {
  it('throws GmoAozoraApiError on 400', async () => {
    mockFetch(400, { errorCode: 'INVALID_PARAMETER', errorMessage: 'bad param' });
    const client = makeClient();
    const err = await client.get('/accounts', { schema: SimpleSchema }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GmoAozoraApiError);
    expect((err as GmoAozoraApiError).status).toBe(400);
    expect((err as GmoAozoraApiError).code).toBe('INVALID_PARAMETER');
  });

  it('throws GmoAozoraApiError on 404', async () => {
    mockFetch(404, { errorCode: 'NOT_FOUND', errorMessage: 'not found' });
    const client = makeClient();
    const err = await client.get('/accounts/x', { schema: SimpleSchema }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GmoAozoraApiError);
    expect((err as GmoAozoraApiError).status).toBe(404);
  });

  it('throws GmoAozoraServerError on 500 after retries exhausted', async () => {
    mockFetch(500, { errorCode: 'INTERNAL_SERVER_ERROR', errorMessage: 'server error' });
    const client = makeClient({ maxRetries: 0 });
    await expect(client.get('/accounts', { schema: SimpleSchema })).rejects.toBeInstanceOf(
      GmoAozoraServerError,
    );
  });
});

describe('HttpClient — 401 + token refresh', () => {
  it('refreshes token on 401 and retries', async () => {
    const refreshTokens = vi.fn().mockResolvedValue(makeTokenSet());
    const spy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'ok' }), { status: 200 }));

    const client = makeClient({ refreshTokens });
    const result = await client.get('/accounts', { schema: SimpleSchema });
    expect(result.id).toBe('ok');
    expect(refreshTokens).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('throws GmoAozoraAuthError when refresh fails after 401', async () => {
    const refreshTokens = vi.fn().mockRejectedValue(new Error('refresh failed'));
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }));

    const client = makeClient({ refreshTokens });
    await expect(client.get('/accounts', { schema: SimpleSchema })).rejects.toBeInstanceOf(
      GmoAozoraAuthError,
    );
  });
});

describe('HttpClient.post', () => {
  it('sends JSON body and returns parsed response', async () => {
    const spy = mockFetch(200, { id: 'new' });
    const client = makeClient();
    const result = await client.post('/virtual-accounts', {
      schema: SimpleSchema,
      body: { name: 'test' },
    });
    expect(result.id).toBe('new');
    const opts = spy.mock.calls[0]?.[1] as RequestInit;
    expect(opts.method).toBe('POST');
    expect(opts.body).toBe(JSON.stringify({ name: 'test' }));
  });
});

describe('HttpClient — retry on 5xx', () => {
  it('retries on 503 and succeeds on second attempt', async () => {
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'ok' }), { status: 200 }));

    const client = makeClient({ maxRetries: 1 });
    const result = await client.get('/accounts', { schema: SimpleSchema });
    expect(result.id).toBe('ok');
  });

  it('throws GmoAozoraServerError after retries exhausted on repeated 503', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 503 }));
    const client = makeClient({ maxRetries: 2 });
    await expect(client.get('/accounts', { schema: SimpleSchema })).rejects.toBeInstanceOf(
      GmoAozoraServerError,
    );
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
  });
});

describe('HttpClient — timeout', () => {
  it('maps AbortError after timeout to GmoAozoraTimeoutError', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) {
          reject(new Error('no signal'));
          return;
        }
        signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });
    const client = makeClient({ maxRetries: 0, timeoutMs: 50 });
    const err = await client.get('/accounts', { schema: SimpleSchema }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GmoAozoraTimeoutError);
  });
});

describe('HttpClient — Retry-After', () => {
  it('waits Retry-After seconds before retrying 429', async () => {
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 429, headers: { 'Retry-After': '1' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'ok' }), { status: 200 }));

    const client = makeClient({ maxRetries: 1 });
    const start = Date.now();
    const result = await client.get('/accounts', { schema: SimpleSchema });
    expect(result.id).toBe('ok');
    expect(Date.now() - start).toBeGreaterThanOrEqual(900);
  }, 5000);

  it('falls back to exponential backoff when Retry-After is unparsable', async () => {
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response('{}', { status: 429, headers: { 'Retry-After': 'never' } }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'ok' }), { status: 200 }));

    const client = makeClient({ maxRetries: 1 });
    const start = Date.now();
    const result = await client.get('/accounts', { schema: SimpleSchema });
    expect(result.id).toBe('ok');
    expect(Date.now() - start).toBeGreaterThanOrEqual(400);
    expect(Date.now() - start).toBeLessThan(2_000);
  }, 5000);
});

describe('HttpClient — network error retry', () => {
  it('retries when fetch rejects then succeeds', async () => {
    vi.spyOn(global, 'fetch')
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'ok' }), { status: 200 }));

    const client = makeClient({ maxRetries: 1 });
    const result = await client.get('/accounts', { schema: SimpleSchema });
    expect(result.id).toBe('ok');
  });
});

describe('HttpClient.delete', () => {
  it('resolves void on 204', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    const client = makeClient();
    await expect(client.delete('/virtual-accounts/x')).resolves.toBeUndefined();
  });
});
