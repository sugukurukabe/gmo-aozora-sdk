import type { HttpClient } from '../http/client.js';
import { GetTransactionsResponseSchema } from './schemas.js';
import type { Transaction, TransactionParams, GetTransactionsResponse } from './schemas.js';

/** Corporation API: account transactions with `nextItemKey` pagination. */
export class TransactionsApi {
  constructor(private readonly http: HttpClient) {}

  /** Single page of transactions; pass `nextItemKey` from a prior response to continue. */
  async list(params: TransactionParams): Promise<GetTransactionsResponse> {
    const query: Record<string, string | undefined> = {
      accountId: params.accountId,
    };
    if (params.dateFrom !== undefined) query['dateFrom'] = params.dateFrom;
    if (params.dateTo !== undefined) query['dateTo'] = params.dateTo;
    if (params.nextItemKey !== undefined) query['nextItemKey'] = params.nextItemKey;

    return this.http.get('/accounts/transactions', {
      schema: GetTransactionsResponseSchema,
      query,
    });
  }

  /**
   * AsyncGenerator that auto-paginates using nextItemKey.
   * Use with `for await...of` — no manual cursor management needed.
   */
  async *iterate(params: Omit<TransactionParams, 'nextItemKey'>): AsyncGenerator<Transaction> {
    let nextItemKey: string | undefined;
    do {
      const iterParams: TransactionParams = { ...params };
      if (nextItemKey !== undefined) iterParams.nextItemKey = nextItemKey;

      const res = await this.list(iterParams);
      for (const tx of res.transactions) {
        yield tx;
      }
      nextItemKey = res.nextItemKey;
    } while (nextItemKey !== undefined);
  }
}
