# @sugukuru/gmo-aozora-sdk

Production-grade TypeScript SDK for GMO Aozora Net Bank's Open API.

The **first** TypeScript-first SDK for GMO Aozora — with Zod v4 validation, OAuth PKCE S256,
retry, rate limiting, and domain-specific helpers for payroll automation.

## Install

```bash
npm install @sugukuru/gmo-aozora-sdk
```

## Quick Start

```typescript
import { GmoAozoraClient, InMemoryTokenStorage, PRIVATE_SCOPES } from '@sugukuru/gmo-aozora-sdk';

const storage = new InMemoryTokenStorage(); // Use KMS-backed TokenStorage in production
const client = new GmoAozoraClient({
  clientId: process.env.GMO_CLIENT_ID!,
  clientSecret: process.env.GMO_CLIENT_SECRET!,
  redirectUri: 'http://localhost:8080/callback',
  environment: 'sunabar', // 'sunabar' | 'staging' | 'production'
  tokenStorage: storage,
  defaultScopes: [PRIVATE_SCOPES.ACCOUNT, PRIVATE_SCOPES.TRANSFER, PRIVATE_SCOPES.OFFLINE_ACCESS],
});

// 1. Get OAuth authorization URL (PKCE S256)
const { url, session } = client.buildAuthorizationUrl();
console.log('Open this URL:', url);

// 2. Exchange authorization code for tokens
const userClient = client.useUser('user-1');
await userClient.exchangeCode({ code: 'CODE_FROM_REDIRECT', state: session.state, session });

// 3. Call corporation APIs
const accountId = '123456789012';
const balance = await userClient.corporation.balances.get(accountId);
console.log('Balance:', balance?.bookBalance);

// 4. Iterate transactions (auto-paginated)
for await (const tx of userClient.corporation.transactions.iterate({
  accountId,
  dateFrom: '2026-05-01',
  dateTo: '2026-05-31',
})) {
  console.log(tx.transactionDate, tx.amount);
}

// 5. Bulk payroll transfer with polling
const bulk = await userClient.corporation.bulkTransfers.create({
  accountId,
  transferDesignatedDate: '2026-05-25',
  totalCount: '1',
  totalAmount: '250000',
  bulkTransfers: [{
    itemId: '1',
    transferAmount: '250000',
    beneficiaryBankCode: '0310',
    beneficiaryBranchCode: '001',
    accountTypeCode: '1',
    accountNumber: '1234567',
    beneficiaryName: 'TANAKA TARO',
  }],
});
const result = await userClient.corporation.bulkTransfers.pollResult(
  { accountId, applyNo: bulk.applyNo },
  { intervalMs: 60_000, timeoutMs: 7_200_000 },
);
```

## Why not the official SDK?

| Feature | Official Node SDK | This SDK |
|---|---|---|
| TypeScript types | ❌ JavaScript only | ✅ Strict TypeScript 5.x |
| Zod validation | ❌ None | ✅ All inputs/outputs |
| Retry on 5xx | ❌ None | ✅ Built-in with backoff |
| Rate limiting | ❌ None | ✅ Token bucket |
| `pollResult` helper | ❌ Manual polling | ✅ `bulkTransfers.pollResult()` |
| Zengin file generation | ❌ None | ✅ `@sugukuru/zengin-format` |
| Webhook verification | ❌ None | ✅ `@sugukuru/gmo-aozora-webhook` |
| Node.js version | >=10 | >=20 (built-in fetch) |

## Packages

This monorepo ships 3 independent packages:

| Package | Description |
|---|---|
| `@sugukuru/gmo-aozora-sdk` | OAuth + corporation API client |
| [`@sugukuru/zengin-format`](../zengin-format) | Zengin file generation (any JP bank) |
| [`@sugukuru/gmo-aozora-webhook`](../webhook) | Webhook HMAC-SHA256 verification |

## Documentation

- [Architecture](../../docs/architecture.md)
- [Security model](../../docs/security.md)
- [Migration from direct API](../../docs/migration-from-direct-api.md)
- [Sunabar validation guide](../../docs/sunabar-validation.md)
- [Examples](../../examples/)

## License

Apache-2.0 — Sugukuru Co., Ltd.
