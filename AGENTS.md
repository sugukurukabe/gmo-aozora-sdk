# @sugukuru/gmo-aozora-sdk — Agent Instructions

## Project Overview

Production-grade TypeScript SDK for GMO Aozora Net Bank's Open API.
Built by Sugukuru Co., Ltd. (Kagoshima) to automate monthly payroll transfers
for 150+ Indonesian Specified Skilled Workers — reducing 14 hours/month of
manual work to 8 minutes of automated batch processing.

## Monorepo Structure

```
packages/
├── core/          @sugukuru/gmo-aozora-sdk       — OAuth + API client
├── zengin-format/ @sugukuru/zengin-format         — Zengin file generation (any JP bank)
└── webhook/       @sugukuru/gmo-aozora-webhook    — Webhook HMAC-SHA256 verification
```

## Key Technologies

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.x, `strict: true`, `exactOptionalPropertyTypes: true`
- **Validation**: Zod v4 — all API inputs/outputs are validated
- **HTTP**: undici (`fetch` via Node 20+ built-in)
- **Tests**: Vitest
- **Build**: tsup
- **Package manager**: pnpm (workspace)

## Commands

```bash
pnpm typecheck    # tsc --noEmit across all packages
pnpm test         # vitest run across all packages
pnpm build        # tsup across all packages
pnpm lint         # eslint + prettier check
pnpm changeset    # add a changeset entry for upcoming release
```

## API Specification (GMO Aozora)

- Base path: `/ganb/api/corporation/v1/`
- Auth header: `x-access-token: <token>` — NOT `Authorization: Bearer`
- Accept: `application/json;charset=UTF-8`
- Amounts are strings ("5800"), not numbers — use `parseAmount()` → bigint
- Pagination uses `nextItemKey` token (GMO-proprietary, not page numbers)
- Scopes: `private:account`, `private:transfer`, `private:offline_access`
- Environments: `sunabar` (sandbox) / `staging` / `production`

## Critical Rules

Always read `.cursor/rules/` before starting a task. Mandatory rules:

- `03-differentiation-guard.mdc` — Never erode the 3 competitive advantages
- `04-self-check-protocol.mdc` — Run this mentally before saying "done"
- `00-mission.mdc` — Why this SDK exists and what it must be

## Differentiation Reminder

We are the only production-grade TypeScript option in the GMO Aozora ecosystem.
Our value comes from three axes that must NEVER be weakened:

1. **Type safety** — Zod everywhere, `ZenginShorui = '11' | '12'` (never string)
2. **Production defaults** — retry, KMS token storage, polling, rate limiting
3. **Domain helpers** — Zengin file generation, residence-aware payroll compliance

If you suggest code that weakens any of these axes, you are eroding our reason
to exist. Consult rule `03-differentiation-guard` before touching types,
defaults, or domain helpers.

## Package-Specific Rules

Each package has its own `AGENTS.md` for local constraints:

- `packages/zengin-format/AGENTS.md` — Zengin format, multi-bank constraints
- `packages/core/` rules via `.cursor/rules/10-oauth-pkce.mdc`, `11-http-layer.mdc`
- `packages/webhook/` rules via `.cursor/rules/14-webhook.mdc` (added Day 5)

## When Uncertain

Before making a change that touches API contracts, types, or security:
1. Invoke `@gmo-spec` for API endpoint questions
2. Invoke `@anti-patterns` if you're not sure a pattern is acceptable
3. Invoke `@multi-bank` for anything in `packages/zengin-format/` or `packages/webhook/`
4. Invoke `@compliance` for anything related to residence status or payroll rules
