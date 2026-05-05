# Release Operations

This document is the operator checklist for preparing and publishing the SDK.

Git push and npm publish are intentionally separate from local verification.
Run the local checks first, then publish only from a clean release branch.

## Local Release Candidate Gate

```bash
pnpm run verify
```

This runs:

- `pnpm typecheck`
- `pnpm test`
- `pnpm lint`
- `pnpm build`
- `pnpm dist:smoke`
- `pnpm api:check`
- `pnpm format:check`
- `pnpm docs:snippets`
- `pnpm docs:typecheck`
- `pnpm examples:typecheck`
- `pnpm security:scan`
- `pnpm audit:security`
- `pnpm metadata:check`
- `pnpm pack:dry-run`

The package dry-run parses `npm pack --dry-run --json` and checks all three
publishable packages from their own working directories:

- `packages/core`
- `packages/zengin-format`
- `packages/webhook`

Each package must include `package.json`, `README.md`, `CHANGELOG.md`, `LICENSE`,
and built CJS/ESM/type declaration files. Source, tests, local config, `.env*`,
and `.tgz` files must not appear in pack output.

## Security Gate

```bash
pnpm security:scan
pnpm audit:security
```

`security:scan` fails if local secret files, package tarballs, private keys, npm
tokens, or production-looking token assignments are present. `audit:security`
fails on **high** or **critical** vulnerabilities. Moderate findings should be
reviewed before release, but they do not block by default because many moderate
advisories are dev-tooling-only. If a moderate advisory affects runtime code or
request paths, treat it as a release blocker.

## NPM_TOKEN Setup (GitHub Actions)

For automated CI-based publishing, set `NPM_TOKEN` as a GitHub Actions secret:

1. Create an **Automation** token at [https://www.npmjs.com/settings/sugukuru/tokens](https://www.npmjs.com/settings/sugukuru/tokens)
   - Choose **Granular Access Token** → Permissions: **Read and write**, Type: **Automation**
   - Scope: all `@sugukuru/*` packages
2. Add it to GitHub secrets at [https://github.com/sugukurukabe/gmo-aozora-sdk/settings/secrets/actions/new](https://github.com/sugukurukabe/gmo-aozora-sdk/settings/secrets/actions/new)
   - Name: `NPM_TOKEN`
3. Once set, the `release.yml` workflow will automatically publish on every merge to `main` that contains a consumed changeset.

> **Token security**: Never share npm tokens in chat, code, or issue comments.
> Rotate tokens immediately if exposed. The Automation token type bypasses 2FA
> for CI but requires explicit package-level scope to limit blast radius.

## Creating a GitHub Release

After publishing to npm, create a GitHub Release from the tag:

```bash
# If gh CLI is available:
gh release create "@sugukuru/gmo-aozora-sdk@0.5.0" \
  --title "v0.5.0 — <summary>" \
  --notes-file RELEASE_NOTES.md \
  --prerelease
```

Or manually at [https://github.com/sugukurukabe/gmo-aozora-sdk/releases/new](https://github.com/sugukurukabe/gmo-aozora-sdk/releases/new):
- Tag: `@sugukuru/gmo-aozora-sdk@0.5.0` (already pushed by `pnpm changeset publish`)
- Title: `v0.5.0 — <brief description>`
- Body: paste the relevant section from `packages/core/CHANGELOG.md`
- Mark as **pre-release** until Sunabar validation is complete

## Changesets

Create a changeset for every user-visible change:

```bash
pnpm changeset
```

Before publishing from `main`, the release workflow uses Changesets to either:

1. Open a version PR, or
2. Publish packages to npm when version changes are already present.

The release workflow requires:

- `GITHUB_TOKEN` from GitHub Actions
- `NPM_TOKEN` with publish rights for the `@sugukuru` npm scope

## Publish Order

The packages are independent, but publish in this order for clean consumer
install experience:

1. `@sugukuru/zengin-format`
2. `@sugukuru/gmo-aozora-webhook`
3. `@sugukuru/gmo-aozora-sdk`

## Final Pre-publish Checklist

- [ ] `pnpm run verify` passes locally
- [ ] CI passes on the release PR
- [ ] `README.md` and `README.ja.md` are current
- [ ] Mirrored README snippets in `docs/snippets/` still compile
- [ ] `docs/snippets/manifest.json` covers every README with TypeScript examples
- [ ] `scripts/public-api-manifest.json` reflects intentional public exports
- [ ] `pnpm metadata:check` confirms package metadata and publish files
- [ ] `pnpm pack:dry-run` confirms package tarballs include `LICENSE` and exclude source/test/config files
- [ ] `pnpm consumer:smoke` passes in a clean temporary consumer project
- [ ] Package READMEs and package CHANGELOGs are current
- [ ] `.changeset/*.md` accurately describes breaking changes
- [ ] No `.env*`, `.tgz`, credentials, or Sunabar tokens are present
- [ ] `docs/sunabar-validation.md` is updated with any newly measured API facts
- [ ] Remaining risks are limited to documented Sunabar-only validation items

## Packed Consumer Smoke Test

Before publishing, run:

```bash
pnpm consumer:smoke
```

This creates a clean temporary project, packs the three local packages into
tarballs, installs them as a consumer would, and verifies:

- ESM imports
- CommonJS `require`
- TypeScript declaration resolution
- Basic runtime usage across core, Zengin, and webhook packages

The temporary project is deleted on success and retained on failure for
debugging.

## Post-publish Smoke Test

In a clean temporary project:

```bash
npm init -y
npm install @sugukuru/gmo-aozora-sdk @sugukuru/zengin-format @sugukuru/gmo-aozora-webhook
node -e "import('@sugukuru/gmo-aozora-sdk').then(m => console.log(Object.keys(m).length > 0))"
```

Then run the Sunabar validation flow from `docs/sunabar-validation.md`.
