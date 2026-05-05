import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient } from '../../http/client.js';
import { VirtualAccountsApi } from '../virtual-accounts.js';
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

const sampleVa = {
  virtualAccountId: 'va-001',
  accountId: 'acc-1',
  virtualAccountNumber: '9876543',
  status: 'ACTIVE' as const,
  createdAt: '2026-05-01T00:00:00Z',
};

describe('VirtualAccountsApi.list', () => {
  it('returns virtual accounts array', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ virtualAccounts: [sampleVa] }), { status: 200 }),
    );

    const api = new VirtualAccountsApi(makeHttp());
    const result = await api.list();
    expect(result).toHaveLength(1);
    expect(result[0]?.virtualAccountId).toBe('va-001');
  });
});

describe('VirtualAccountsApi.create', () => {
  it('posts and returns the new virtual account', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ virtualAccount: sampleVa }), { status: 200 }),
    );

    const api = new VirtualAccountsApi(makeHttp());
    const result = await api.create({ accountId: 'acc-1' });
    expect(result.virtualAccountId).toBe('va-001');
    expect(result.status).toBe('ACTIVE');
  });
});

describe('VirtualAccountsApi.updateStatus', () => {
  it('patches status and returns updated account', async () => {
    const updated = { ...sampleVa, status: 'INACTIVE' as const };
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ virtualAccount: updated }), { status: 200 }),
    );

    const api = new VirtualAccountsApi(makeHttp());
    const result = await api.updateStatus('va-001', 'INACTIVE');
    expect(result.status).toBe('INACTIVE');
  });
});

describe('VirtualAccountsApi.transactions', () => {
  it('returns transactions for a virtual account', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          transactions: [
            {
              transactionId: 'tx-va-1',
              transactionDate: '2026-05-05',
              transactionType: 'CREDIT',
              amount: '50000',
              balance: '50000',
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const api = new VirtualAccountsApi(makeHttp());
    const result = await api.transactions('va-001');
    expect(result).toHaveLength(1);
    expect(result[0]?.amount).toBe('50000');
  });
});
