import type { HttpClient } from '../http/client.js';
import { GetBalancesResponseSchema } from './schemas.js';
import type { Balance } from './schemas.js';

/** Corporation API: balances (`GET /accounts/balances`). */
export class BalancesApi {
  constructor(private readonly http: HttpClient) {}

  /** Returns the first balance row for `accountId`, if any. */
  async get(accountId: string): Promise<Balance | undefined> {
    const res = await this.http.get('/accounts/balances', {
      schema: GetBalancesResponseSchema,
      query: { accountId },
    });
    return res.balances[0];
  }

  /** Returns all balance rows returned by the API (no `accountId` filter). */
  async list(): Promise<Balance[]> {
    const res = await this.http.get('/accounts/balances', {
      schema: GetBalancesResponseSchema,
    });
    return res.balances;
  }
}
