import type { HttpClient } from '../http/client.js';
import {
  GetTransactionsResponseSchema,
  GetVirtualAccountsResponseSchema,
  CreateVirtualAccountResponseSchema,
  UpdateVirtualAccountStatusResponseSchema,
} from './schemas.js';
import type {
  VirtualAccount,
  CreateVirtualAccountInput,
  VirtualAccountStatus,
  Transaction,
} from './schemas.js';

/** Corporation API: virtual accounts (振込入金口座). */
export class VirtualAccountsApi {
  constructor(private readonly http: HttpClient) {}

  /** Lists virtual accounts; optionally filter by `accountId`. */
  async list(accountId?: string): Promise<VirtualAccount[]> {
    const query: Record<string, string | undefined> = {};
    if (accountId !== undefined) query['accountId'] = accountId;

    const res = await this.http.get('/virtual-accounts', {
      schema: GetVirtualAccountsResponseSchema,
      query,
    });
    return res.virtualAccounts;
  }

  /** Creates a new virtual account. */
  async create(input: CreateVirtualAccountInput): Promise<VirtualAccount> {
    const res = await this.http.post('/virtual-accounts', {
      schema: CreateVirtualAccountResponseSchema,
      body: input,
    });
    return res.virtualAccount;
  }

  /** Updates virtual account status (e.g. ACTIVE / INACTIVE / CLOSED). */
  async updateStatus(
    virtualAccountId: string,
    status: VirtualAccountStatus,
  ): Promise<VirtualAccount> {
    const res = await this.http.patch(`/virtual-accounts/${virtualAccountId}`, {
      schema: UpdateVirtualAccountStatusResponseSchema,
      body: { status },
    });
    return res.virtualAccount;
  }

  /** Lists deposit transactions for a virtual account. */
  async transactions(virtualAccountId: string): Promise<Transaction[]> {
    const res = await this.http.get(`/virtual-accounts/${virtualAccountId}/transactions`, {
      schema: GetTransactionsResponseSchema,
    });
    return res.transactions;
  }
}
