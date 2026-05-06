# Changelog

## 0.5.1

### Patch Changes

- dd103b8: Sunabar sandbox validation completed successfully (2026-05-05)
  - Fixed base URLs and API path prefixes for the `sunabar` environment (`api.sunabar.gmo-aozora.com`, `/corporation/v1/`, `/auth/v1/`)
  - Updated `AccountSchema` and `BalanceSchema` to accept live Sunabar response shapes (optional `bankCode`/`accountType`, new fields like `balance`, `withdrawableAmount`, `previousDayBalance`, `baseDate`/`baseTime` at root)
  - Switched schemas from `.strict()` to `.passthrough()` for forward compatibility
  - Improved `sunabar-dry-run.ts` harness: auto-selects first account when `GMO_ACCOUNT_ID` is omitted, prints candidate `accountId`s, and safely summarizes balance responses
  - Added comprehensive Sunabar validation report (`docs/sunabar-validation-report.md`) and README badge

  All 168 tests passing, full `pnpm verify` gate clean. Sunabar is now officially supported and validated.

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

All notable changes to `@sugukuru/gmo-aozora-sdk` are tracked here.

## 0.4.0

### Added

- `TransfersApi.pollResult()` for single transfer result polling.
- Contract fixture tests for corporation API schemas.
- npm metadata and package README.

### Changed

- `TransactionSchema` now uses `.passthrough()` for pre-Sunabar response resilience.
- Root verification now includes typecheck, tests, lint, build, format, examples, and pack dry-run.

### Fixed

- Corporation API rule docs now use GMO verb-style transfer paths (`/transfer/request`, `/bulktransfer/request`).
