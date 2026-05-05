import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient } from '../../http/client.js';
import { AccountsApi } from '../accounts.js';
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

describe('AccountsApi.list', () => {
  it('returns accounts array on success', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          accounts: [
            {
              accountId: 'acc-1',
              accountName: 'Test Corp',
              bankCode: '0310',
              branchCode: '001',
              accountType: '普通',
              accountNumber: '1234567',
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const api = new AccountsApi(makeHttp());
    const result = await api.list();
    expect(result).toHaveLength(1);
    expect(result[0]?.accountId).toBe('acc-1');
  });

  it('returns empty array when no accounts', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ accounts: [] }), { status: 200 }),
    );

    const api = new AccountsApi(makeHttp());
    const result = await api.list();
    expect(result).toHaveLength(0);
  });
});
