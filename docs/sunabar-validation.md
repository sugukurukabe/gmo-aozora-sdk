# Sunabar Validation Guide

> **Sunabar** (すなばる) is GMO Aozora Net Bank's sandbox environment.
> This guide explains how to validate the SDK against real API calls
> **without** committing credentials to the repository.

## Prerequisites

1. Obtain a Sunabar account from [GMO Aozora Developer Portal](https://gmo-aozora.com/business/api/)
2. Create an app and note down:
   - `clientId` (OAuth client identifier)
   - `clientSecret` (never commit this)
   - Registered redirect URI (e.g. `http://localhost:8080/callback`)

## Environment Setup

Create a `.env.local` file (already in `.gitignore`):

```bash
# .env.local — NEVER commit this file
GMO_CLIENT_ID=your-client-id-here
GMO_CLIENT_SECRET=your-client-secret-here
GMO_REDIRECT_URI=http://localhost:8080/callback
GMO_ENVIRONMENT=sunabar
```

Verify `.gitignore` covers this:

```bash
grep '.env' .gitignore
# Should show: .env*
```

## Authentication Flow (PKCE S256)

Run the OAuth flow to get tokens. The SDK handles PKCE internally:

```typescript
import { GmoAozoraClient, InMemoryTokenStorage, PRIVATE_SCOPES } from '@sugukuru/gmo-aozora-sdk';

const storage = new InMemoryTokenStorage(); // Local validation only; use KMS/Vault in production.

const client = new GmoAozoraClient({
  clientId: process.env.GMO_CLIENT_ID!,
  clientSecret: process.env.GMO_CLIENT_SECRET!,
  redirectUri: process.env.GMO_REDIRECT_URI!,
  environment: 'sunabar',
  tokenStorage: storage,
  defaultScopes: [PRIVATE_SCOPES.ACCOUNT, PRIVATE_SCOPES.TRANSFER, PRIVATE_SCOPES.OFFLINE_ACCESS],
});

// Step 1: Get authorization URL
const { url, session } = client.buildAuthorizationUrl();

console.log('Open this URL in your browser:', url);
console.log('State:', session.state);
```

After browser redirect back, exchange the code:

```typescript
const userId = 'local-test-user';
const userClient = client.useUser(userId);

await userClient.exchangeCode({
  code: 'CODE_FROM_REDIRECT',
  state: session.state,
  session,
});
```

## Validation Checklist

Work through these in order. Each step builds on the previous.

Before real API calls, run the safe harness:

```bash
npx tsx examples/sunabar-dry-run.ts
```

This default mode makes no network calls and does not print secrets. After
setting a sandbox access token, run readonly checks explicitly:

```bash
npx tsx examples/sunabar-dry-run.ts --execute-readonly
```

### 1. Account Information

```typescript
// GET /accounts
const accounts = await userClient.corporation.accounts.list();
console.log('Accounts:', accounts);

// Save accountId for subsequent calls
const accountId = accounts[0]?.accountId;
```

**Verify:**
- [ ] Response parses successfully with `AccountSchema.strict()`
- [ ] `accountId`, `accountName`, `bankCode`, `branchCode`, `accountType`, `accountNumber` are all present
- [ ] No unexpected extra fields (if there are, update schema to `.passthrough()`)

### 2. Balance Check

```typescript
const balance = await userClient.corporation.balances.get(accountId);
console.log('Balance:', balance?.bookBalance);
```

**Verify:**
- [ ] `bookBalance` and `availableBalance` are string values
- [ ] Field name `bookBalance` matches actual response (not `balance`)

### 3. Transaction List (pagination)

```typescript
for await (const tx of userClient.corporation.transactions.iterate({
  accountId,
  dateFrom: '2026-01-01',
  dateTo: '2026-12-31',
})) {
  console.log('Transaction:', tx.transactionId, tx.amount);
}
```

**Verify:**
- [ ] `transactionId` field name is correct (may be `trnId` or `transactionSeq` in actual response)
- [ ] If field name is wrong, update `TransactionSchema` in `packages/core/src/corporation/schemas.ts`
- [ ] Pagination works correctly with `nextItemKey`

### 4. Virtual Account Operations

```typescript
// Create a virtual account
const created = await userClient.corporation.virtualAccounts.create({
  accountId,
  label: 'Sunabar test VA',
});
const vaId = created.virtualAccount.virtualAccountId;

// List virtual accounts
const list = await userClient.corporation.virtualAccounts.list(accountId);

// Update status
await userClient.corporation.virtualAccounts.updateStatus(vaId, 'INACTIVE');
```

**Verify:**
- [ ] `VirtualAccountStatus` enum values are correct: `'ACTIVE' | 'INACTIVE' | 'CLOSED'`
- [ ] `virtualAccountNumber` field name is correct
- [ ] Status update returns the updated account

### 5. Single Transfer (dry run only in Sunabar)

```typescript
// Estimate fee first
const fee = await userClient.corporation.transfers.estimateFee({
  accountId,
  transferDesignatedDate: '2026-06-25',
  transfers: [{
    itemId: '1',
    transferAmount: '5800',
    beneficiaryBankCode: '0001',
    beneficiaryBranchCode: '100',
    accountTypeCode: '1',
    accountNumber: '0000001',
    beneficiaryName: 'ﾔﾏﾀﾞ ﾀﾛｳ',
  }],
});
console.log('Fee estimate:', fee.totalFee);

// Create transfer
const transfer = await userClient.corporation.transfers.create({...});
if (transfer.resultCode === '2') {
  // Poll for completion
  const result = await userClient.corporation.transfers.pollResult({
    accountId,
    applyNo: transfer.applyNo,
  }, { intervalMs: 3_000, timeoutMs: 60_000 });
  console.log('Result:', result.resultCode);
}
```

**Verify:**
- [ ] Transfer create response has `resultCode`, `applyNo`
- [ ] `pollResult` transitions from `'2'` to `'1'` within timeout
- [ ] Cancel endpoint works with `cancelTargetKeyClass: '2'`

### 6. Webhook Validation

To validate webhook signature verification, you need an endpoint accessible from GMO's servers.
Use [ngrok](https://ngrok.com/) or similar tunnel service for local testing:

```bash
# Terminal 1: Start the webhook example server
WEBHOOK_SECRET=your-test-secret npx tsx examples/webhook-express.ts

# Terminal 2: Expose it via ngrok
ngrok http 3000
```

Register the ngrok URL in the GMO Aozora console as your webhook endpoint.
Trigger a deposit to a virtual account and watch the logs.

**Verify:**
- [ ] Request arrives with `x-webhook-signature` header (base64)
- [ ] `verifyWebhookSignature` returns `true` for the real GMO signature
- [ ] Event parses successfully with field names: `notificationId`, `eventType`, `eventTime`, `data`
- [ ] `data.virtualAccountId` matches the VA that received the deposit
- [ ] `data.amount` is a string, `data.senderName` is half-width kana

### 7. Bulk Transfer (Payroll scenario)

```typescript
const payload = await userClient.corporation.bulkTransfers.create({
  accountId,
  transferDesignatedDate: '2026-06-25',
  totalCount: '3',
  totalAmount: '750000',
  bulkTransfers: Array.from({ length: 3 }, (_, i) => ({
    itemId: String(i + 1),
    transferAmount: '250000',
    beneficiaryBankCode: '0001',
    beneficiaryBranchCode: '100',
    accountTypeCode: '1',
    accountNumber: `000000${i + 1}`,
    beneficiaryName: `ﾃｽﾄ ｼｬｲﾝ${i + 1}`,
  })),
});

const result = await userClient.corporation.bulkTransfers.pollResult({
  accountId,
  applyNo: payload.applyNo,
}, { intervalMs: 60_000, timeoutMs: 7_200_000 });

console.log('Bulk result:', result.resultCode);
```

**Verify:**
- [ ] Bulk transfer accepts up to 9,999 items
- [ ] `pollResult` waits correctly for `resultCode '2'` → `'1'`
- [ ] Bulk status codes include bulk-specific `'30'` (結果確定済み)

## Common Sunabar Issues

| Issue | Likely Cause | Fix |
|---|---|---|
| `401 UNAUTHORIZED` | Token expired | Call `getAccessToken()` to refresh |
| `400 INVALID_PARAMETER` | Field name mismatch | Compare request body with spec PDF |
| Schema parse fails | GMO added/renamed a field | Change schema to `.passthrough()` and log what came in |
| Webhook signature fails | Using hex instead of base64 | SDK uses base64 since v0.4.0 — check client version |
| `TypeError: fetch failed` | Wrong base URL | Check `environment: 'sunabar'` in config |

## After Sunabar Validation

Once all checklist items pass:

1. Fill `docs/sunabar-validation-report-template.md` with sanitized evidence
2. Update `ROADMAP.md` — mark Sunabar items as ✅
3. Fix any field name mismatches in schemas
4. Run `pnpm run verify` to confirm all local gates still pass
5. Create a changeset: `pnpm changeset`
6. Follow the [CONTRIBUTING.md](../CONTRIBUTING.md) guide for the release PR

## Secret Management Rules

- Never write `.env.local` contents into any code or documentation file
- Never add credentials to `examples/` or `docs/`
- The `.gitignore` already covers `.env*` — verify before every commit
- In CI, use GitHub Actions Secrets for any integration tests against Sunabar
