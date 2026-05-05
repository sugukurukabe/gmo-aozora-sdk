# Sunabar Validation Report Template

Use this file as the evidence template for v1.0 release readiness.

Do not paste secrets, access tokens, refresh tokens, full account numbers, real
customer names, or raw webhook bodies that contain personal data. Mask identifiers
to the minimum needed to reproduce schema or field-name findings.

## Session

- Date: _(fill in actual validation date)_
- SDK commit / local snapshot: `afb77ec` (main, 2026-05-05)
- Operator: _(fill in)_
- Sunabar app: _(fill in — app name registered at the developer portal)_
- Redirect URI: `http://localhost:8080/callback`
- SDK version under test: `0.5.0-rc` (pre-release)
- Node.js version: v22.22.0
- Command:
  - `pnpm run verify`
  - `pnpm sunabar:dry-run`
  - `pnpm sunabar:readonly`

## Local Gates

| Gate | Result | Notes |
|---|---|---|
| `pnpm typecheck` | ✅ PASS | 0 errors, strict + exactOptionalPropertyTypes |
| `pnpm test` | ✅ PASS | 277 tests (core 167, zengin-format 67, webhook 43) |
| `pnpm lint` | ✅ PASS | 0 errors, 0 warnings |
| `pnpm build` | ✅ PASS | ESM + CJS + .d.ts + .d.mts for all 3 packages |
| `pnpm dist:smoke` | ✅ PASS | All expected exports present in built dist |
| `pnpm format:check` | ✅ PASS | Prettier format consistent |
| `pnpm docs:typecheck` | ✅ PASS | README snippet mirrors typecheck clean |
| `pnpm examples:typecheck` | ✅ PASS | All examples typecheck including sunabar-dry-run.ts |
| `pnpm audit:security` | ✅ PASS | 0 high/critical advisories |
| `pnpm pack:dry-run` | ✅ PASS | All 3 packages pack cleanly |
| `pnpm sunabar:dry-run` | ✅ PASS | No network calls, PKCE session prepared correctly |

## Readonly API Validation

| Endpoint / helper | Result | Sanitized evidence |
|---|---|---|
| `accounts.list()` |  | account count, field names only |
| `balances.get(accountId)` |  | amount fields are strings |
| `transactions.iterate()` |  | pagination / `nextItemKey` behavior |
| `virtualAccounts.list(accountId)` |  | field names and status enum values |

## Write API Validation

Only run these against approved sandbox data.

| Endpoint / helper | Result | Sanitized evidence |
|---|---|---|
| `virtualAccounts.create()` |  | created ID masked |
| `virtualAccounts.updateStatus()` |  | status transition |
| `transfers.estimateFee()` |  | fee fields and string amounts |
| `transfers.create()` |  | `resultCode`, masked `applyNo` |
| `transfers.pollResult()` |  | final `resultCode` |
| `bulkTransfers.estimateFee()` |  | fee fields and string amounts |
| `bulkTransfers.create()` |  | `resultCode`, masked `applyNo` |
| `bulkTransfers.pollResult()` |  | final `resultCode` |

## Webhook Validation

| Check | Result | Sanitized evidence |
|---|---|---|
| Header name is `x-webhook-signature` |  | observed headers, no secret |
| Signature is base64 HMAC-SHA256 |  | verification result only |
| Raw body verification before JSON parse |  | framework configuration |
| `WebhookEventSchema` field names match |  | field names only |
| `VaDepositTransactionSchema` field names match |  | field names only |

## Zengin Validation

| Check | Result | Sanitized evidence |
|---|---|---|
| Generated file record count |  | header/data/trailer/end counts |
| Every record is 120 bytes |  | byte count summary |
| Shorui `'11'` payroll accepted |  | acceptance result |
| Shorui `'12'` bonus accepted |  | acceptance result if tested |
| Non-GMO destination bank accepted |  | masked bank code only |

## Findings

Record every mismatch, even if it is small.

| Severity | Area | Finding | Fix required |
|---|---|---|---|
|  |  |  |  |

## Release Decision

- [ ] All local gates passed
- [ ] Readonly Sunabar checks passed
- [ ] Required write-flow Sunabar checks passed
- [ ] Webhook delivery passed
- [ ] Zengin acceptance passed
- [ ] All findings are fixed or explicitly documented

Decision:

- [ ] Go for v1.0 release branch
- [ ] No-go, fix findings first
