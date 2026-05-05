# @sugukuru/gmo-aozora-sdk

[![CI](https://github.com/sugukurukabe/gmo-aozora-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/sugukurukabe/gmo-aozora-sdk/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/@sugukuru%2Fgmo-aozora-sdk.svg)](https://www.npmjs.com/package/@sugukuru/gmo-aozora-sdk)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](package.json)

> The first production-grade TypeScript SDK for GMO Aozora Net Bank's Open API.
>
> 日本語版: [README.ja.md](README.ja.md)

## Why this SDK?

| Capability | Official Node SDK | Other JP banks | **This SDK** |
|---|---|---|---|
| TypeScript first | ❌ JS, Node 10+ | ❌ | ✅ |
| Zod validation | ❌ | ❌ | ✅ |
| Auto retry / rate limit | ❌ | ❌ | ✅ |
| Zengin file generation | ❌ | ❌ | ✅ |
| Compile-time shorui validation | ❌ | ❌ | ✅ |
| Webhook HMAC verification | manual | ❌ | ✅ |
| Target workload | unknown | — | **150+ payroll transfers/month** |

## Built for production

> Authored by [Sugukuru Co., Ltd.](https://sugukuru.co.jp) (Kagoshima, Japan)
> to automate the monthly payroll workflow for 150+ Indonesian Specified Skilled
> Workers — replacing 14 hours of manual transcription with 8 minutes of typed
> batch processing.
>
> See [production-stories/sugukuru-payroll.md](production-stories/sugukuru-payroll.md)
> for the design goals, current status, and metrics that will be tracked
> after the first production payroll run.

## Quick start

```bash
npm install @sugukuru/gmo-aozora-sdk
```

```typescript
import { GmoAozoraClient, PRIVATE_SCOPES } from "@sugukuru/gmo-aozora-sdk";

const client = new GmoAozoraClient({
  environment: "sunabar",
  clientId: process.env.GMO_CLIENT_ID!,
  clientSecret: process.env.GMO_CLIENT_SECRET!,
  redirectUri: "https://app.example.com/callback",
  defaultScopes: [PRIVATE_SCOPES.ACCOUNT, PRIVATE_SCOPES.OFFLINE_ACCESS],
}).useUser("user-123");

const balance = await client.corporation.balances.get("123456789012");
console.log(balance?.bookBalance); // string amount, e.g. "100000"
```

### Fetch account balance

```typescript
const user = new GmoAozoraClient({
  environment: "sunabar",
  clientId: process.env.GMO_CLIENT_ID!,
  clientSecret: process.env.GMO_CLIENT_SECRET!,
  redirectUri: "https://app.example.com/callback",
}).useUser("user-123");

// After OAuth callback and exchangeCode():
const balance = await user.corporation.balances.get("123456789012");
console.log(balance?.bookBalance); // "100000" (string; use parseAmount() for bigint)
```

### Paginate all transactions (auto-paging)

```typescript
import { parseAmount } from "@sugukuru/gmo-aozora-sdk";

let total = 0n;
for await (const tx of user.corporation.transactions.iterate({ accountId: "123456789012" })) {
  total += parseAmount(tx.amount);
}
console.log(`Total: ${total}`);
```

### Submit a payroll bulk transfer

```typescript
// Submit 総合振込 for this month's payroll
const result = await user.corporation.bulkTransfers.create({
  accountId: "123456789012",
  transferDesignatedDate: "2026-05-25",
  totalCount: "3",
  totalAmount: "650000",
  bulkTransfers: [
    {
      itemId: "1",
      transferAmount: "250000",
      beneficiaryBankCode: "0310",
      beneficiaryBranchCode: "001",
      accountTypeCode: "1",
      accountNumber: "1234567",
      beneficiaryName: "TANAKA TARO",
    },
    // ... more items
  ],
});

// If resultCode === '2' (still processing), poll until complete
if (result.resultCode === "2") {
  const final = await user.corporation.bulkTransfers.pollResult(
    { accountId: "123456789012", applyNo: result.applyNo },
    { timeoutMs: 60_000 },
  );
  console.log("Completed:", final.applyNo);
}
```

### Single transfer with fee estimate

```typescript
const input = {
  accountId: "123456789012",
  transferDesignatedDate: "2026-05-15",
  transfers: [{
    transferAmount: "50000",
    beneficiaryBankCode: "0001",
    beneficiaryBranchCode: "001",
    accountTypeCode: "1" as const,
    accountNumber: "1234567",
    beneficiaryName: "SUZUKI HANAKO",
  }],
};

// Check fee before submitting
const fee = await user.corporation.transfers.estimateFee(input);
console.log("Fee:", fee.totalFee); // "330"

// Submit
const result = await user.corporation.transfers.create(input);
```

### More examples

See the [`examples/`](examples/) directory for runnable scripts:

- [`balance-check.ts`](examples/balance-check.ts) — fetch and display account balance
- [`transactions-iterate.ts`](examples/transactions-iterate.ts) — stream transactions with `for await...of`
- [`payroll-batch.ts`](examples/payroll-batch.ts) — full payroll flow with Zengin file + bulk transfer + poll
- [`webhook-express.ts`](examples/webhook-express.ts) — Express server with webhook verification
- [`sunabar-dry-run.ts`](examples/sunabar-dry-run.ts) — credential-safe Sunabar validation harness

```bash
npx tsx examples/balance-check.ts
npx tsx examples/sunabar-dry-run.ts
```

## Why not the official SDK?

GMO Aozora provides official SDKs in Python, Node.js (JavaScript), and PHP. All three are
[Swagger Codegen](https://github.com/swagger-api/swagger-codegen) output targeting the OpenAPI
spec. We use them only as **reference** for endpoint paths and model names.

| | Official Node.js SDK | **This SDK** |
|---|---|---|
| Language | JavaScript, Node 10+ | TypeScript 5.x strict |
| Validation | None (raw JSON) | Zod v4 everywhere |
| Retry / rate limit | None | ✅ built-in |
| Domain types | `string` | `AccountTypeCode = '1'|'2'|'4'|'9'` |
| `pollResult` helper | None | ✅ production helper |
| Token storage | Environment variable | `TokenStorage` interface (KMS-ready) |
| Zengin file generation | None | ✅ `@sugukuru/zengin-format` |

See [`docs/spec-audit/official-sdk-crosswalk.md`](docs/spec-audit/official-sdk-crosswalk.md)
for the full crosswalk between official SDK models and our typed schemas.

## Packages

| Package | Description |
|---|---|
| [`@sugukuru/gmo-aozora-sdk`](packages/core) | OAuth 2.0 + PKCE, all Corporation APIs |
| [`@sugukuru/zengin-format`](packages/zengin-format) | Zengin file generation (any JP bank) |
| [`@sugukuru/gmo-aozora-webhook`](packages/webhook) | Webhook HMAC-SHA256 verification |

## Features

- **OAuth 2.0 + PKCE S256** — authorization code flow, token refresh, revocation
- **All Corporation APIs** — accounts, balances, transactions, virtual accounts, transfers, bulk transfers
- **Auto-retry** — 500/502/503/504/429 with exponential backoff + jitter
- **Rate limiting** — token bucket (10 req/s default)
- **Zengin file generation** — shorui 11 (payroll) and 12 (bonus), 120-byte fixed-length
- **Compile-time domain safety** — `ZenginShorui = '11' | '12'` prevents typos at build time
- **Webhook verification** — HMAC-SHA256 with `timingSafeEqual` (timing-attack safe)
- **Pluggable token storage** — ship-with `InMemoryTokenStorage` for dev/test, BYO
  KMS-backed implementation for production via the `TokenStorage` interface
  (Cloud KMS adapters are tracked on the post-v1.0 roadmap)

## Documentation

- [Architecture](docs/architecture.md)
- [Security](docs/security.md)
- [Migration from direct API calls](docs/migration-from-direct-api.md)
- [Spec audit / official SDK crosswalk](docs/spec-audit/official-sdk-crosswalk.md)
- [Sunabar validation guide](docs/sunabar-validation.md)
- [v1.0 release readiness](docs/v1-release-readiness.md)
- [Release operations](docs/release-operations.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). We welcome PRs that meet the quality
bar described there. All contributions must pass CI.

## Acknowledgements

- [GMO Aozora Net Bank](https://gmo-aozora.com) — sunabar open API
- 全銀協 (Zengin-Kyokai) — Zengin format standard
- The MCP / Model Context Protocol community

## License

Apache-2.0 © Sugukuru Co., Ltd.
