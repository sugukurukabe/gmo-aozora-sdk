# Changelog

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
