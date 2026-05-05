import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient } from '../../http/client.js';
import { BalancesApi } from '../balances.js';
import type { TokenSet } from '../../storage/index.js';

function makeTokenSet(): TokenSet {
  return {
    accessToken: 'tok',
    refreshToken: 'rtok',
    expiresAt: Date.now() + 3600_000,
    tokenType: 'Bearer',
    scope: 'private:account',
  };
}

function makeHttp() {
  return new HttpClient({
    baseUrl: 'https://sandbox.example.com',
    getAccessToken: () => Promise.resolve('tok'),
    refreshTokens: () => Promise.resolve(makeTokenSet()),
    maxRetries: 0,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

const sampleBalance = {
  accountId: 'acc-1',
  bookBalance: '100000',
  availableBalance: '95000',
  balanceDate: '2026-05-05',
};

describe('BalancesApi', () => {
  it('get() returns first balance for accountId', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ balances: [sampleBalance] }), { status: 200 }),
    );

    const api = new BalancesApi(makeHttp());
    const result = await api.get('acc-1');
    expect(result?.bookBalance).toBe('100000');
    expect(result?.availableBalance).toBe('95000');
  });

  it('list() returns all balances', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ balances: [sampleBalance, { ...sampleBalance, accountId: 'acc-2' }] }),
        { status: 200 },
      ),
    );

    const api = new BalancesApi(makeHttp());
    const result = await api.list();
    expect(result).toHaveLength(2);
  });

  it('get() returns undefined when no balances', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ balances: [] }), { status: 200 }),
    );

    const api = new BalancesApi(makeHttp());
    const result = await api.get('acc-1');
    expect(result).toBeUndefined();
  });
});
