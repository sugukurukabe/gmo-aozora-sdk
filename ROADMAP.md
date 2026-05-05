# Roadmap — @sugukuru/gmo-aozora-sdk

> Last updated: 2026-05-05

## v0.5.0 (released — 2026-05-05) 🚀

**First public release on npm.**

- ✅ All 3 packages published: `@sugukuru/gmo-aozora-sdk`, `@sugukuru/zengin-format`, `@sugukuru/gmo-aozora-webhook`
- ✅ CJS + ESM + TypeScript declarations verified with consumer smoke test from `npm install`
- ✅ Sunabar validation harness (`pnpm sunabar:dry-run`) and step-by-step guide (`docs/sunabar-guide.md`)
- ✅ OAuth 2.0 PKCE S256 callback server example (`examples/oauth-callback-server.ts`)
- ✅ Quick Start rewritten for immediate usability: direct token injection + full OAuth flow
- ✅ 277 tests passing (core 167, zengin-format 67, webhook 43)
- ✅ `pnpm run verify` gate: typecheck, test, lint, build, dist smoke, public API, format, docs snippets, examples typecheck, security scan, audit, metadata check, pack dry-run

### npm links

- [`@sugukuru/gmo-aozora-sdk@0.5.0`](https://www.npmjs.com/package/@sugukuru/gmo-aozora-sdk)
- [`@sugukuru/zengin-format@0.5.0`](https://www.npmjs.com/package/@sugukuru/zengin-format)
- [`@sugukuru/gmo-aozora-webhook@0.5.0`](https://www.npmjs.com/package/@sugukuru/gmo-aozora-webhook)

## v0.4.0 (completed — 2026-05-05)

- ✅ `@sugukuru/zengin-format` v1.0 — 120-byte Shift_JIS Zengin file generation (67 tests, including golden snapshots)
- ✅ `@sugukuru/gmo-aozora-webhook` v1.0 — HMAC-SHA256 webhook verification + Express middleware (39 tests)
- ✅ Webhook spec alignment: base64 signature encoding, `x-webhook-signature` header, `eventType`/`data` field names
- ✅ `TransfersApi.pollResult` — parity with `BulkTransfersApi.pollResult`
- ✅ API contract fixture tests (24 tests), Zengin golden regression tests (8), webhook boundary tests (15)
- ✅ npm metadata: `repository`, `homepage`, `bugs`, `keywords`, `sideEffects: false` in all packages
- ✅ Per-package READMEs for `@sugukuru/zengin-format` and `@sugukuru/gmo-aozora-webhook`
- ✅ Spec-audit: classified `NOTE(spec-confirm)` and `NEEDS-SUNABAR-VALIDATION` items so every field that still requires live evidence is annotated in source
- ✅ Rules updated: `12-corporation-api.mdc` and `40-gmo-api-spec.mdc` now use correct GMO verb-style paths
- ✅ README snippet quality gate: mirrored examples in `docs/snippets/`, manifest check, and typecheck in `pnpm run verify`
- ✅ Sunabar validation harness and report template added for credential-safe release evidence

## v0.3.0 (completed)

- ✅ `TransfersApi` — single and batch transfers (up to 99 items)
- ✅ `BulkTransfersApi` — payroll-style bulk transfers (総合振込) up to 9,999 items
- ✅ `pollResult` — production polling helper for async transfer results
- ✅ `docs/spec-audit/official-sdk-crosswalk.md` — three-way model reference

## v1.0.0 (stable release target)

Goals for the first stable release:

- All Corporation APIs covered (see table below)  ✅ (done in v0.4)
- `TransfersApi.pollResult` for single transfers  ✅ (done in v0.4)
- Webhook `va-deposit-transaction` fully tested against Sunabar  ⏳
- `@sugukuru/zengin-format` v1.0 with full shorui 11/12 support  ✅ (done in v0.4)
- GitHub Actions CI passing on `main`  ✅ (done in v0.4)
- `npm publish` dry-run green  ✅ (verified via `npm pack --dry-run`)

### v1.0 RC Checklist

Items that MUST be done before `git push` and `npm publish`:

| Item | Status | Notes |
|---|---|---|
| `pnpm typecheck` passes | ✅ | All 3 packages |
| `pnpm test` passes | ✅ | 277 tests total (core 167, zengin-format 67, webhook 43) |
| `pnpm lint` passes | ✅ | No warnings |
| `pnpm build` passes | ✅ | ESM + CJS + DTS |
| `pnpm dist:smoke` passes | ✅ | Built CJS/ESM package exports |
| `pnpm api:check` passes | ✅ | Public API manifest |
| `pnpm format:check` passes | ✅ | Prettier |
| `pnpm docs:snippets` passes | ✅ | README snippet manifest |
| `pnpm docs:typecheck` passes | ✅ | README snippet mirrors |
| `pnpm examples:typecheck` passes | ✅ | 5 examples |
| `pnpm security:scan` passes | ✅ | Local secret/artifact scan |
| `pnpm metadata:check` passes | ✅ | Package metadata and files |
| `npm pack --dry-run` clean (all 3) | ✅ | LICENSE included; source/test/config excluded |
| `pnpm consumer:smoke` passes | ✅ | Packed tarballs install in clean temp project |
| Sunabar: account/balance/transaction GET | ⏳ | Needs live credential |
| Sunabar: VA create/update/list | ⏳ | Needs live credential |
| Sunabar: transfer create + pollResult | ⏳ | Needs live credential |
| Sunabar: webhook delivery + signature verify | ⏳ | Needs live endpoint |
| Zengin `.dat` accepted by test bank | ⏳ | Needs live submission |
| Changeset version bump committed | ✅ | v0.5.0 published to npm |

## Corporation API Coverage

| Category | Namespace | v0.2 | v0.3 | v0.4 | v1.0 |
|---|---|---|---|---|---|
| 口座照会 | `corporation.accounts` | ✅ | ✅ | ✅ | ✅ |
| 残高照会 | `corporation.balances` | ✅ | ✅ | ✅ | ✅ |
| 入出金明細照会 | `corporation.transactions` | ✅ | ✅ | ✅ | ✅ |
| 振込入金口座 (VA) | `corporation.virtualAccounts` | ✅ | ✅ | ✅ | ✅ |
| 振込依頼 | `corporation.transfers` | — | ✅ | ✅ | ✅ |
| 総合振込依頼 | `corporation.bulkTransfers` | — | ✅ | ✅ | ✅ |
| 振込状況照会 (typed) | `transfers.getStatus` | — | partial | ✅ | ✅ |
| 総合振込状況照会 (typed) | `bulkTransfers.getStatus` | — | partial | ✅ | ✅ |
| Zengin file generation | `@sugukuru/zengin-format` | stub | stub | ✅ | ✅ |
| Webhook HMAC verification | `@sugukuru/gmo-aozora-webhook` | stub | stub | ✅ | ✅ |

## Post-v1.0 (v1.1+)

These items exist in the GMO Aozora PDF spec but are **out of scope** for v1.0:

| Feature | Notes |
|---|---|
| 定額自動振込 (scheduled recurring transfers) | Complex state machine, low priority for payroll use case |
| 法人口座情報変更 | Administrative API, not needed for payment automation |
| Personal banking APIs | Different OAuth scope (`private:personal`), separate package |
| sugukuru-finance MCP server | MCP server wrapping this SDK for AI agent integration |
| Cloud KMS `TokenStorage` | AWS KMS / GCP KMS implementations in separate packages |
| Multi-bank abstraction layer | Generic `JpBankClient` interface (v1.2+) |

## Differentiation vs Official SDKs

See [`docs/spec-audit/official-sdk-crosswalk.md`](docs/spec-audit/official-sdk-crosswalk.md)
for the full comparison. Our three-axis differentiation that will **never** be regressed:

1. **Type safety** — Zod v4 everywhere, literal union types for domain codes
2. **Production defaults** — retry, rate limiting, `pollResult`, `TokenStorage`
3. **Domain helpers** — Zengin file generation, SSW-aware payroll compliance

> Rule: `.cursor/rules/03-differentiation-guard.mdc`
