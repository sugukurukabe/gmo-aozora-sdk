import type { HttpClient } from '../http/client.js';
import { GetAccountsResponseSchema } from './schemas.js';
import type { Account } from './schemas.js';

/** Corporation API: account list (`GET /accounts`). */
export class AccountsApi {
  constructor(private readonly http: HttpClient) {}

  /** Returns all accounts visible to the authenticated user. */
  async list(): Promise<Account[]> {
    const res = await this.http.get('/accounts', {
      schema: GetAccountsResponseSchema,
    });
    return res.accounts;
  }
}
