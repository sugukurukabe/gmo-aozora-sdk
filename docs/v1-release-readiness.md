# v1.0 Release Readiness

This is the current release-readiness ledger for the first stable SDK release.
It separates local engineering confidence from facts that still require Sunabar
or publish-environment evidence.

## Current Completion Estimate

**Local SDK readiness: 95%.**

The implementation, package structure, 277 tests, builds, docs snippets, examples,
package metadata, public-API manifest, security/audit/metadata gates, and packed
consumer smoke test are already in v1.0 RC shape. The remaining ~5% is not more
scaffolding; it is mostly live validation evidence:

- Sunabar response field names and edge cases
- Webhook delivery and signature header confirmation from a real endpoint
- Transfer and bulk transfer lifecycle behavior under sandbox credentials
- Zengin `.dat` acceptance in the intended bank/test flow
- Release branch, remote CI, changeset versioning, and npm publish operation

## Done Locally

- All 3 publishable packages exist and build as ESM/CJS with `.d.ts` and `.d.mts` declarations.
- Corporation API namespaces cover accounts, balances, transactions, virtual accounts, transfers, and bulk transfers.
- OAuth PKCE uses S256 only and stores tokens through `TokenStorage`.
- HTTP layer includes retry with `Retry-After` parsing (delta-seconds and HTTP-date, capped at 60s), timeout handling, token-bucket rate limiting, typed errors, request IDs, and Zod response validation.
- Webhook verification uses base64 HMAC-SHA256 and timing-safe comparison; Express middleware refuses non-Buffer bodies; framework-agnostic `verifyAndParseWebhookEvent` is exposed.
- Zengin generation validates 120-byte records, encodes Shift_JIS without external deps, converts half-width kana, and includes byte-level golden tests.
- README snippets for the root and each package are mirrored in `docs/snippets/` and typechecked.
- Examples are typechecked, including the credential-safe Sunabar dry-run harness.
- Consistent GitHub owner across `repository.url`, `homepage`, and `bugs.url` enforced by `metadata:check`.
- Per-package `LICENSE` files included in published tarballs; source/test/config files explicitly excluded.
- `pnpm run verify` passes locally (typecheck, test, lint, build, dist smoke, public API, format, docs snippet manifest/typecheck, examples typecheck, security scan, dependency audit, metadata check, pack dry-run).
- `pnpm consumer:smoke` packs all three packages, installs them in a clean temporary consumer project, and verifies ESM, CJS, and TypeScript declaration usage end-to-end.

## Blocking Before v1.0 Publish

| Area | Status | Required evidence |
|---|---|---|
| Remote Git repository | Not confirmed | Repository initialized, release branch pushed, CI green |
| Account/balance/transaction Sunabar calls | Pending | Validation report with sanitized response shape notes |
| Virtual account operations | Pending | Create/list/update flow confirmed in Sunabar |
| Transfer lifecycle | Pending | Fee estimate, create, poll, cancel behavior confirmed |
| Bulk transfer lifecycle | Pending | Create, poll, status code behavior confirmed |
| Webhook delivery | Pending | Real delivery confirms header name, base64 signature, event body shape |
| Zengin acceptance | Pending | Generated `.dat` accepted by the target test flow |
| Release versioning | Pending | Changesets consumed and package versions finalized |

## Go / No-Go Rule

Do not publish v1.0 until every blocking row above has evidence or an explicit
release note that scopes it out. Local tests can prove the SDK is internally
consistent; Sunabar validation proves the contract with GMO Aozora is accurate.

## Recommended Next Order

1. Run `pnpm run verify` locally after any edit.
2. Run `pnpm consumer:smoke` before release branching.
3. Run `npx tsx examples/sunabar-dry-run.ts` with no credentials to confirm safe setup.
4. Run `npx tsx examples/sunabar-dry-run.ts --execute-readonly` with sandbox credentials.
5. Fill `docs/sunabar-validation-report-template.md` with sanitized observations.
6. Fix any schema or path mismatch found in live responses.
7. Repeat `pnpm run verify`.
8. Only then move to Git branch, remote CI, changeset versioning, and publish preparation.
