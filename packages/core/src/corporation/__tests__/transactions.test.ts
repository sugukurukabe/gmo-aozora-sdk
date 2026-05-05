import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient } from '../../http/client.js';
import { TransactionsApi } from '../transactions.js';
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

const makeTx = (id: string) => ({
  transactionId: id,
  transactionDate: '2026-05-05',
  transactionType: 'CREDIT',
  amount: '5800',
  balance: '100000',
});

describe('TransactionsApi.list', () => {
  it('returns transactions and nextItemKey', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          transactions: [makeTx('tx-1'), makeTx('tx-2')],
          nextItemKey: 'cursor-abc',
        }),
        { status: 200 },
      ),
    );

    const api = new TransactionsApi(makeHttp());
    const result = await api.list({ accountId: 'acc-1' });
    expect(result.transactions).toHaveLength(2);
    expect(result.nextItemKey).toBe('cursor-abc');
  });

  it('returns empty transactions and no nextItemKey on last page', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ transactions: [] }), { status: 200 }),
    );

    const api = new TransactionsApi(makeHttp());
    const result = await api.list({ accountId: 'acc-1' });
    expect(result.transactions).toHaveLength(0);
    expect(result.nextItemKey).toBeUndefined();
  });
});

describe('TransactionsApi.iterate', () => {
  it('paginates across multiple pages and yields all items', async () => {
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            transactions: [makeTx('tx-1'), makeTx('tx-2')],
            nextItemKey: 'cursor-page2',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            transactions: [makeTx('tx-3')],
            // no nextItemKey → last page
          }),
          { status: 200 },
        ),
      );

    const api = new TransactionsApi(makeHttp());
    const collected: string[] = [];
    for await (const tx of api.iterate({ accountId: 'acc-1' })) {
      collected.push(tx.transactionId);
    }

    expect(collected).toEqual(['tx-1', 'tx-2', 'tx-3']);
  });

  it('stops after single page when no nextItemKey', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ transactions: [makeTx('tx-1')] }), { status: 200 }),
    );

    const api = new TransactionsApi(makeHttp());
    const results: string[] = [];
    for await (const tx of api.iterate({ accountId: 'acc-1' })) {
      results.push(tx.transactionId);
    }
    expect(results).toEqual(['tx-1']);
  });
});
