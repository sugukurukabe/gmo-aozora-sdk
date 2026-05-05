# Migration from Direct API Calls

This document shows side-by-side comparisons of raw `fetch` vs the SDK for the four most common operations.

## 1. Balance Check

**Before — raw fetch:**
```typescript
const token = process.env.ACCESS_TOKEN;
const response = await fetch(
  'https://api.gmo-aozora.com/ganb/api/corporation/v1/accounts/balances?accountId=123',
  {
    headers: {
      'x-access-token': token,
      'Accept': 'application/json;charset=UTF-8',
    },
  }
);
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const data = await response.json(); // untyped any
const balance = data.balances[0].bookBalance; // could throw at runtime
```

**After — SDK:**
```typescript
import { GmoAozoraClient, InMemoryTokenStorage, parseAmount } from '@sugukuru/gmo-aozora-sdk';

const client = new GmoAozoraClient({ environment: 'sunabar', clientId, clientSecret, redirectUri, tokenStorage });
const userClient = client.useUser('user-id');

const balance = await userClient.corporation.balances.get('123');
// balance is typed: Balance | undefined
const amount = balance ? parseAmount(balance.bookBalance) : BigInt(0);
// amount is bigint — safe arithmetic, no floating-point errors
```

Benefits: typed response, `parseAmount()` → bigint, automatic retry on transient errors, proactive token refresh, request ID for debugging.

---

## 2. Transactions (Paginated)

**Before — raw fetch with manual pagination:**
```typescript
let nextItemKey: string | undefined;
const allTransactions = [];
do {
  const url = new URL('https://api.gmo-aozora.com/ganb/api/corporation/v1/accounts/transactions');
  url.searchParams.set('accountId', accountId);
  if (nextItemKey) url.searchParams.set('nextItemKey', nextItemKey);

  const res = await fetch(url, { headers: { 'x-access-token': token } });
  const data = await res.json(); // untyped
  allTransactions.push(...data.transactions);
  nextItemKey = data.nextItemKey;
} while (nextItemKey);
```

**After — SDK with async iterator:**
```typescript
for await (const tx of userClient.corporation.transactions.iterate({ accountId, dateFrom, dateTo })) {
  console.log(tx.transactionDate, parseAmount(tx.amount));
  // tx is fully typed: Transaction
}
```

Benefits: no manual pagination, typed transactions, automatic rate limiting prevents hammering the API on large datasets.

---

## 3. Single Transfer

**Before — raw fetch:**
```typescript
const body = {
  accountId,
  transferDesignatedDate: '2026-05-25',
  transfers: [{
    transferAmount: '5000',
    beneficiaryBankCode: '0001',
    beneficiaryBranchCode: '001',
    accountTypeCode: '1',
    accountNumber: '1234567',
    beneficiaryName: 'YAMADA TARO',
  }],
};

const res = await fetch(
  'https://api.gmo-aozora.com/ganb/api/corporation/v1/transfer/request',
  {
    method: 'POST',
    headers: {
      'x-access-token': token,
      'Content-Type': 'application/json',
      'Accept': 'application/json;charset=UTF-8',
    },
    body: JSON.stringify(body),
  }
);
// No validation of the response shape
const data = await res.json();
```

**After — SDK:**
```typescript
const result = await userClient.corporation.transfers.create({
  accountId,
  transferDesignatedDate: '2026-05-25',
  transfers: [{
    transferAmount: '5000',
    beneficiaryBankCode: '0001', // TypeScript validates: exactly 4 chars
    beneficiaryBranchCode: '001', // TypeScript validates: exactly 3 chars
    accountTypeCode: '1',         // TypeScript validates: '1' | '2' | '4' | '9'
    accountNumber: '1234567',     // TypeScript validates: exactly 7 chars
    beneficiaryName: 'YAMADA TARO',
  }],
});
// result.resultCode is '1' | '2' — typed, not arbitrary string
```

Benefits: compile-time validation of field lengths, typed `resultCode` literal union, automatic retry on server errors.

---

## 4. Bulk Transfer with Polling

**Before — raw fetch with polling loop:**
```typescript
const createRes = await fetch('.../bulktransfer/request', { method: 'POST', ... });
const { applyNo } = await createRes.json();

// Manual polling
for (let i = 0; i < 20; i++) {
  await new Promise(resolve => setTimeout(resolve, 3000));
  const pollRes = await fetch(`.../bulktransfer/request-result?accountId=${accountId}&applyNo=${applyNo}`);
  const poll = await pollRes.json();
  if (poll.resultCode !== '2') {
    console.log('Done:', poll.resultCode);
    break;
  }
}
// No timeout protection, no typed error
```

**After — SDK `pollResult`:**
```typescript
const createResult = await userClient.corporation.bulkTransfers.create({ ... });

const finalResult = await userClient.corporation.bulkTransfers.pollResult(
  { accountId, applyNo: createResult.applyNo },
  { timeoutMs: 60_000, intervalMs: 3_000 }
);
// Throws GmoAozoraTimeoutError if not done in 60s
// finalResult.resultCode is '1' | '8' (never '2' — the polling loop handles that)
```

Benefits: built-in timeout with `GmoAozoraTimeoutError`, configurable interval, typed result, no boilerplate polling loop.
