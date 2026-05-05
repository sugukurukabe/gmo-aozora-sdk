# Changelog

All notable changes to `@sugukuru/gmo-aozora-sdk` will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> Pre-release status: nothing in this changelog has been published to npm yet.
> Versions below describe internal milestones leading up to the v1.0 RC.
> The first published version on npm will be cut from the `[Unreleased]`
> section via `pnpm changeset version` and `pnpm changeset publish`.

---

## [Unreleased] — v0.5.0 (v1.0 RC preparation)

### Added

- `docs/snippets/` contains typechecked mirrors of README code examples for the root README and all package READMEs.
- `pnpm docs:snippets` validates the README-to-snippet manifest; `pnpm docs:typecheck` validates the snippets, and `pnpm run verify` now includes both gates.
- `pnpm security:scan`, `pnpm metadata:check`, and `pnpm api:check` add local release-hardening gates for secret/artifact leakage, package metadata drift, and public export regressions.
- Package-level `LICENSE` files and stricter `pnpm pack:dry-run` checks ensure published tarballs contain legal notices and exclude source/test/config files.
- `pnpm consumer:smoke` packs all three packages, installs them into a clean temporary consumer project, and verifies ESM, CJS, and TypeScript declaration usage.
- `examples/sunabar-dry-run.ts` provides a credential-safe Sunabar validation harness. By default it makes no network calls; readonly API checks require `--execute-readonly`.
- `docs/v1-release-readiness.md` and `docs/sunabar-validation-report-template.md` document current completion status and evidence required before v1.0.

### Fixed

- Updated stale package README and Sunabar validation examples to match the current `GmoAozoraClient` API (`buildAuthorizationUrl()`, `useUser()`, `balances.get(accountId)`, required bulk transfer totals).

---

## [0.4.0] — 2026-05-05 (v1.0 RC preparation)

### Fixed — Webhook spec alignment (breaking changes before v1.0 publish)

- **`verifyWebhookSignature`**: Changed signature encoding from **hex** to **base64** to match GMO Aozora spec
  - `createHmac('sha256', secret).update(rawBody).digest()` compared via `Buffer.from(signature, 'base64')`
- **`webhookMiddleware`**: Changed default `headerName` from `'x-gmo-signature'` to **`'x-webhook-signature'`**
- **`WebhookEventSchema`**: Renamed fields to match GMO API spec:
  - `eventName` → `eventType`
  - `eventId` → `notificationId`
  - `occurredAt` → `eventTime`
  - `payload` → `data`
- **`VaDepositTransactionSchema`**: Renamed `accountId` → `virtualAccountId`, added optional `senderName` field

### Fixed — Rule accuracy

- **`.cursor/rules/12-corporation-api.mdc`**: Updated endpoint paths from incorrect REST-style (`/transfers/{id}`) to correct GMO verb-style (`/transfer/request`, `/transfer/cancel`, etc.)
- **`.cursor/rules/40-gmo-api-spec.mdc`**: Same correction, plus added correct paths for all bulk transfer endpoints

### Added — `TransfersApi.pollResult` (parity with `BulkTransfersApi`)

- `TransfersApi.pollResult(params, opts?)` — polls `/transfer/request-result` until `resultCode !== '2'` or timeout
- Throws `GmoAozoraTimeoutError` on timeout (consistent with `BulkTransfersApi.pollResult`)
- 4 new tests for: immediate complete, expired, polling loop, timeout

### Added — Contract fixture and golden tests

- **`packages/core/src/corporation/__tests__/contract.test.ts`** — 24 fixture-based contract tests validating Zod schemas against realistic API response shapes (Account, Balance, Transaction, VirtualAccount, Transfer, BulkTransfer schemas)
- **`packages/zengin-format/src/__tests__/golden.test.ts`** — 8 byte-exact golden regression tests including snapshot, record order, multi-bank bank code verification
- **`packages/webhook/src/__tests__/boundary.test.ts`** — 15 boundary tests (base64 vs hex encoding, single-byte tampering, empty/large body, unknown event types, future event schema)

### Added — `@sugukuru/zengin-format` v1.0 (first full implementation)

- **`buildZenginFile(input)`** — assembles header + N data + trailer + end records into a `Buffer`; every record is asserted at exactly 120 bytes before concatenation
- **`toHalfWidthKana(str)`** — full-width katakana → half-width (voiced consonants ガ→ｶﾞ, semi-voiced パ→ﾊﾟ, punctuation ー→ｰ)
- **`encodeShiftJis(text)`** — custom Shift_JIS encoder for the ASCII + half-width kana subset; zero external dependencies (`iconv-lite` not required)
- **Literal types**: `ZenginShorui = '11' | '12'`, `AccountTypeCode = '1' | '2' | '4' | '9'`
- Zod schemas for all input fields: `ZenginFileInputSchema`, `ZenginRecordSchema`, `ZenginRemitterSchema`
- 59 tests: kana conversion (11), encoding (7), padding (9), records (17), builder (10), multi-bank (5)

### Added — `@sugukuru/gmo-aozora-webhook` v1.0 (first full implementation)

- **`verifyWebhookSignature({ rawBody, signature, secret })`** — HMAC-SHA256 with `crypto.timingSafeEqual`; returns `false` on length mismatch (no throw)
- **`parseWebhookEvent(rawBody)`** — JSON parse + Zod validation → `WebhookEvent`; throws `WebhookPayloadError` on failure
- **`webhookMiddleware({ secret, headerName? })`** — Express middleware; requires `express.raw()` upstream; attaches `req.webhookEvent` on success
- **Error types**: `WebhookError`, `WebhookSignatureError`, `WebhookPayloadError`
- **Schemas**: `WebhookEventSchema`, `WebhookEventNameSchema = z.literal('va-deposit-transaction')`, `VaDepositTransactionSchema`
- Header name is parameterized (not hardcoded GMO header) per multi-bank-readiness rule
- 22 tests: verify (6), parse (5), schemas (7), express middleware (4)

### Added — Transfer status typed schemas (`@sugukuru/gmo-aozora-sdk`)

- **`TransferRequestStatusCodeSchema`** — literal union of 14 documented status codes `'2' | '3' | '4' | '5' | '8' | '11' | '12' | '13' | '20' | '22' | '24' | '25' | '26' | '40'`
- **`BulkTransferRequestStatusCodeSchema`** — bulk-specific 11-code union including `'30'` (一括振込結果確定済み)
- **`TransferStatusResponseSchema`** / **`BulkTransferStatusResponseSchema`** — typed wrappers with `.passthrough()` at item level for forward compatibility
- `TransfersApi.getStatus()` and `BulkTransfersApi.getStatus()` now return typed responses instead of `unknown`
- 6 new tests for status code literal unions and getStatus() API behavior

### Added — Examples and documentation

- **`examples/`** — 4 runnable TypeScript examples with `examples/tsconfig.json` for type-checking
  - `balance-check.ts`, `transactions-iterate.ts`, `payroll-batch.ts`, `webhook-express.ts`
- **`docs/architecture.md`** — package boundary diagram, request lifecycle, retry/rate-limit, error hierarchy, OAuth flow, Zengin layout
- **`docs/security.md`** — token storage interface, log redaction, webhook timing-safe verification, TLS rules
- **`docs/migration-from-direct-api.md`** — side-by-side: raw `fetch` vs SDK for 4 operations
- **`production-stories/sugukuru-payroll.md`** — 14h → 8min story with metrics and code excerpt

### Changed

- `@sugukuru/zengin-format` package.json — added `zod` as dependency
- `@sugukuru/gmo-aozora-webhook` package.json — added `zod`, `express`, `@types/express` dependencies
- Root `package.json` — added `express` and `@types/express` to devDependencies for examples typecheck

---

## [0.3.0] — 2026-05-05 (internal milestone)

### Added

- **`TransfersApi`** (`corporation.transfers`) — single and batch transfer (振込依頼, up to 99 items)
  - `create(input)` — POST `/transfer/request`
  - `getStatus(params)` — GET `/transfer/status`
  - `getResult(params)` — GET `/transfer/request-result`
  - `estimateFee(input)` — POST `/transfer/transferfee`
  - `cancel(input)` — POST `/transfer/cancel`
- **`BulkTransfersApi`** (`corporation.bulkTransfers`) — payroll-style batch transfer (総合振込)
  - `create(input)` — POST `/bulktransfer/request`
  - `getStatus(params)` — GET `/bulktransfer/status`
  - `getResult(params)` — GET `/bulktransfer/request-result`
  - `estimateFee(input)` — POST `/bulktransfer/transferfee`
  - `cancel(input)` — POST `/bulktransfer/cancel`
  - **`pollResult(params, opts)`** — production helper: polls until `resultCode !== '2'` or `GmoAozoraTimeoutError`
- **Transfer schemas** — `TransferItemSchema`, `TransferCreateInputSchema`, `TransferCreateResponseSchema`, `TransferResultResponseSchema`, `TransferCancelInputSchema`, `TransferFeeResponseSchema`, `BulkTransferCreateInputSchema`, `BulkTransferCreateResponseSchema`
  - Literal union types: `AccountTypeCode = '1' | '2' | '4' | '9'`, `TransferDateHolidayCode = '1' | '2' | '3'`
- **`docs/spec-audit/official-sdk-crosswalk.md`** — three-way reference table: PDF categories ↔ official Python/PHP SDK operation names ↔ our TypeScript namespace
- 20 new tests covering create/getResult/estimateFee/cancel and `pollResult` (completed / polling / timeout / expired)

### Changed

- `GmoAozoraUserClient.corporation` now includes `transfers` and `bulkTransfers` namespaces
- `src/index.ts` exports all new transfer types

---

## [0.2.0] — 2026-05-05

### Added

- **HTTP common layer** (`packages/core/src/http/`)
  - `HttpClient` — typed `fetch` wrapper with retry, rate limiting, Zod validation, and request IDs
  - `RateLimiter` — token-bucket algorithm (default 10 req/s to match GMO guideline)
  - `ConsoleLogger` / `NoopLogger` — Logger interface + default implementations
  - `parseAmount(value: string): bigint` / `formatAmount(value: bigint): string` — safe monetary helpers
  - `generateUuidV7(): string` — time-ordered UUID for `x-request-id` headers
- **Corporation API v1** (`packages/core/src/corporation/`)
  - `AccountsApi.list()` — GET `/accounts`
  - `BalancesApi.get(accountId)` / `BalancesApi.list()` — GET `/accounts/balances`
  - `TransactionsApi.list(params)` — GET `/accounts/transactions` with cursor pagination
  - `TransactionsApi.iterate(params)` — `AsyncGenerator<Transaction>` — auto-paginates using `nextItemKey`
  - `VirtualAccountsApi.list()` / `.create()` / `.updateStatus()` / `.transactions()` — virtual account management
- All Corporation API namespaces exposed as `userClient.corporation.*`
- Full Zod v4 schema coverage for all response types
- **OSS / repo hygiene:** Apache-2.0 `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `.gitignore`, `.editorconfig`, per-package `.npmignore`
- **Tooling:** `tsup.config.ts` in all three packages; ESLint 8 + Prettier (root); `.changeset/config.json` for releases
- **`redactLogMeta`** and **`ApiErrorBodySchema`** — safe log metadata + Zod-validated API error JSON on non-2xx responses

### Changed

- `GmoAozoraUserClient` — added `corporation` namespace (previously empty shell)
- **`ConsoleLogger`** — redacts sensitive keys in `meta` before stringifying
- **`package.json` exports** — `import` → `./dist/index.mjs`, `require` → `./dist/index.js` (matches tsup dual build)
- **`InMemoryTokenStorage`** — `save` / `load` / `delete` return `Promise` without `async` (satisfies `@typescript-eslint/require-await`)
- **TypeScript `include`** — test files included in `tsc --noEmit` for all packages

### Tests

- 112 tests passing (core package; HTTP timeout / Retry-After / retry exhaustion / DELETE 204; logger redaction; OAuth revoke + proactive refresh)

---

## [0.1.0] — 2026-05-04

### Added

- OAuth 2.0 + PKCE S256 authentication (`OAuthClient`)
- PKCE utilities: `generateCodeVerifier`, `generateCodeChallenge`, `generateState`, `verifyState`
- `TokenStorage` interface + `InMemoryTokenStorage` (development only)
- Typed error hierarchy: `GmoAozoraError`, `GmoAozoraAuthError`, `GmoAozoraStateMismatchError`,
  `GmoAozoraApiError`, `GmoAozoraValidationError`, `GmoAozoraServerError`, `GmoAozoraTimeoutError`
- `GmoAozoraClient` + `GmoAozoraUserClient` entry points
- Multi-environment support: `sunabar` / `staging` / `production`
- 62 unit tests
