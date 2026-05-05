# Sunabar Validation Report Template

Use this file as the evidence template for v1.0 release readiness.

Do not paste secrets, access tokens, refresh tokens, full account numbers, real
customer names, or raw webhook bodies that contain personal data. Mask identifiers
to the minimum needed to reproduce schema or field-name findings.

## Session

- Date:
- SDK commit / local snapshot:
- Operator:
- Sunabar app:
- Redirect URI:
- SDK version under test:
- Node.js version:
- Command:
  - `pnpm run verify`
  - `npx tsx examples/sunabar-dry-run.ts`
  - `npx tsx examples/sunabar-dry-run.ts --execute-readonly`

## Local Gates

| Gate | Result | Notes |
|---|---|---|
| `pnpm typecheck` |  |  |
| `pnpm test` |  |  |
| `pnpm lint` |  |  |
| `pnpm build` |  |  |
| `pnpm dist:smoke` |  |  |
| `pnpm format:check` |  |  |
| `pnpm docs:typecheck` |  |  |
| `pnpm examples:typecheck` |  |  |
| `pnpm audit:security` |  |  |
| `pnpm pack:dry-run` |  |  |

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
