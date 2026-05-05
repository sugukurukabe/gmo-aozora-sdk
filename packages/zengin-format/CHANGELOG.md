# Changelog

## 0.5.0

### Minor Changes

- 38e14f9: v0.5.0 (v1.0 RC preparation): webhook spec alignment, TransfersApi.pollResult, contract fixtures, golden tests, release-hardening gates, consumer smoke test, and Sunabar validation harness.

  ### Breaking changes (webhook package)
  - `verifyWebhookSignature`: signature must now be base64-encoded (was hex)
  - `webhookMiddleware` default header changed from `x-gmo-signature` to `x-webhook-signature`
  - `WebhookEvent` field names: `eventType` (was `eventName`), `notificationId` (was `eventId`), `eventTime` (was `occurredAt`), `data` (was `payload`)
  - `VaDepositTransaction`: `virtualAccountId` (was `accountId`), added `senderName`

  ### New features
  - `TransfersApi.pollResult()` — parity with `BulkTransfersApi.pollResult()`; polls `/transfer/request-result` until `resultCode !== '2'`
  - `verifyAndParseWebhookEvent()` — framework-agnostic webhook helper for Hono/Fastify/custom servers
  - `examples/sunabar-dry-run.ts` — credential-safe Sunabar validation harness with explicit readonly execution mode
  - `docs/v1-release-readiness.md` and `docs/sunabar-validation-report-template.md` — release readiness ledger and sanitized evidence template
  - Local release-hardening scripts: `security:scan`, `metadata:check`, and `api:check`
  - Package-level `LICENSE` files and parsed `pack:dry-run` output checks for required and forbidden files
  - `consumer:smoke` — packs tarballs, installs them into a clean temp consumer project, and verifies ESM/CJS/type usage
  - 53 new tests: contract fixtures (24), Zengin golden regression (8), webhook boundary (15), transfer pollResult (4), schemas test additions (2)

  ### Bug fixes
  - `.cursor/rules/12-corporation-api.mdc` and `40-gmo-api-spec.mdc`: corrected endpoint paths from REST-style to GMO verb-style (`/transfer/request`, not `/transfers/{id}`)
  - `TransactionSchema` changed from `.strict()` to `.passthrough()` for pre-Sunabar resilience

  ### Project
  - All packages bumped to `0.4.0`
  - npm metadata added: `repository`, `homepage`, `bugs`, `keywords`, `sideEffects: false`
  - Per-package READMEs added for `@sugukuru/zengin-format` and `@sugukuru/gmo-aozora-webhook`
  - Root scripts: `format:check`, `format:write`, `examples:typecheck`, `pack:dry-run`, `ci`
  - CI workflow updated to include Prettier check, examples typecheck, and `npm pack --dry-run` for all 3 packages
  - `docs/sunabar-validation.md` added: credential-safe validation workflow and checklist
  - Zod dependency upgraded from beta to stable v4
  - `pnpm run verify` now includes built `dist` import smoke tests, public API manifest checks, README snippet manifest/typecheck, local secret scan, metadata checks, and high/critical dependency audit

All notable changes to `@sugukuru/zengin-format` are tracked here.

## 0.4.0

### Added

- Full Zengin fixed-length file generation with header, data, trailer, and end records.
- Shift_JIS/CP932 subset encoding for ASCII and half-width kana.
- `ZenginShorui = '11' | '12'` literal type for payroll and bonus files.
- Golden byte-level regression tests and multi-bank fixtures.
- Package README and npm metadata.

### Security / Correctness

- Every generated record is asserted at exactly 120 bytes.
- No GMO-specific bank code is hardcoded in this package.
