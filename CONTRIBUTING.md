# Contributing to @sugukuru/gmo-aozora-sdk

Thank you for your interest in contributing. This document explains how to develop, test, and submit changes.

## Before You Start

Read these files first — they define our quality bar:

- [`AGENTS.md`](AGENTS.md) — project overview and mission
- [`.cursor/rules/03-differentiation-guard.mdc`](.cursor/rules/03-differentiation-guard.mdc) — forbidden patterns
- [`.cursor/rules/04-self-check-protocol.mdc`](.cursor/rules/04-self-check-protocol.mdc) — pre-submission checklist
- [`docs/REJECTED.md`](docs/REJECTED.md) — intentionally rejected features (check before proposing)

## Development Setup

**Requirements:** Node.js 20+, pnpm 9+

```bash
git clone https://github.com/sugukurukabe/gmo-aozora-sdk.git
cd gmo-aozora-sdk
pnpm install
pnpm run verify   # runs every quality gate: typecheck, test, lint, build,
                  # dist smoke, public API check, format, docs snippets,
                  # examples typecheck, security scan, audit, metadata, pack
```

To iterate faster, run individual gates while developing:

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
pnpm consumer:smoke   # packed tarball install in a clean temp project
```

## Monorepo Structure

```
packages/
  core/          @sugukuru/gmo-aozora-sdk   — OAuth + API client
  zengin-format/ @sugukuru/zengin-format    — Zengin file generation (any JP bank)
  webhook/       @sugukuru/gmo-aozora-webhook — Webhook HMAC-SHA256 verification
```

Changes to `zengin-format` or `webhook` must not introduce GMO-specific logic.
See `.cursor/rules/03-differentiation-guard.mdc` §Forbidden Pattern 5.

## Commit Message Convention

```
<type>(<scope>): <subject>

<body — explain the motivation, not just what changed>

<refs: issue #, spec section, ADR>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`

Scopes: `core`, `zengin-format`, `webhook`, `ci`, `docs`

## Pull Request Checklist

Before opening a PR, confirm every item:

- [ ] `pnpm run verify` passes (typecheck, test, lint, build, dist smoke, format, docs snippets, examples typecheck, security scan, audit, metadata, pack dry-run)
- [ ] New tests cover the change (happy path + at least one failure mode)
- [ ] A changeset was added: `pnpm changeset`
- [ ] Differentiation guards observed (rule `03`): no loose types, no Excel outputs, no sync I/O
- [ ] Self-check protocol completed (rule `04`): type integrity, test coverage, spec compliance
- [ ] JSDoc updated for any new or changed public API
- [ ] `docs/REJECTED.md` checked — the feature isn't already rejected
- [ ] If the public API surface changed, `scripts/public-api-manifest.json` reflects the new exports
- [ ] If a README TypeScript example changed, the mirror in `docs/snippets/` was updated

## Adding a Changeset

Every user-facing change requires a changeset:

```bash
pnpm changeset
# Select the affected package(s) and bump type (patch/minor/major)
# Write a one-line description of what changed and why
```

Changeset files are committed alongside the code change.

## Type Safety Rules

- No `any` — use `unknown` and narrow, or use Zod schemas
- No `@ts-ignore` — use `@ts-expect-error` with a comment explaining why
- No `JSON.parse` without immediate Zod validation
- Monetary amounts: always `string` from API, convert to `bigint` with `parseAmount()`
- Literal unions for domain codes: `ZenginShorui = '11' | '12'` — never `string`

## Security Rules

- Never log access tokens, refresh tokens, or secrets
- Always use `timingSafeEqual` for HMAC comparison (webhook)
- Read raw body as `Buffer` before JSON parsing (webhook)
- Token storage must use the `TokenStorage` interface — not plaintext

## Asking for Help

Open a GitHub Discussion or issue with the `question` label.
For security vulnerabilities, see [`SECURITY.md`](SECURITY.md).
