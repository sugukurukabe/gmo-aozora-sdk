---
"@sugukuru/gmo-aozora-sdk": patch
---

Sunabar sandbox validation completed successfully (2026-05-05)

- Fixed base URLs and API path prefixes for the `sunabar` environment (`api.sunabar.gmo-aozora.com`, `/corporation/v1/`, `/auth/v1/`)
- Updated `AccountSchema` and `BalanceSchema` to accept live Sunabar response shapes (optional `bankCode`/`accountType`, new fields like `balance`, `withdrawableAmount`, `previousDayBalance`, `baseDate`/`baseTime` at root)
- Switched schemas from `.strict()` to `.passthrough()` for forward compatibility
- Improved `sunabar-dry-run.ts` harness: auto-selects first account when `GMO_ACCOUNT_ID` is omitted, prints candidate `accountId`s, and safely summarizes balance responses
- Added comprehensive Sunabar validation report (`docs/sunabar-validation-report.md`) and README badge

All 168 tests passing, full `pnpm verify` gate clean. Sunabar is now officially supported and validated.