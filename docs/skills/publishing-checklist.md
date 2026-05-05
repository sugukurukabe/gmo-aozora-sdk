# Publishing Checklist Skill

> Use this skill before running `pnpm changeset version` and `npm publish`.

## Pre-release Checklist

### 1. Code Quality

```bash
pnpm run verify    # must pass end-to-end
```

`pnpm run verify` runs typecheck, tests, lint, build, dist smoke test, public API
export check, format check, docs snippet manifest check, docs snippet typecheck,
examples typecheck, local secret scan, security audit, package metadata check,
and pack dry-run.

### 2. Changelog

- [ ] `pnpm changeset` was run for every user-facing change
- [ ] `pnpm changeset version` has been run to consume changesets when preparing a release PR
- [ ] `CHANGELOG.md` in each affected package reflects the changes

### 3. Competitive Positioning Check

Before publishing, review `docs/skills/competitive-positioning.md` and confirm:
- [ ] No regression of the 3 differentiation axes
- [ ] Comparison table in README.md is still accurate
- [ ] If a new capability was added, update the table

### 4. Security

- [ ] `pnpm audit:security` — no critical or high vulnerabilities
- [ ] `pnpm security:scan` — no `.env*`, `.tgz`, private keys, npm tokens, or production-looking tokens
- [ ] No new hardcoded secrets in any file
- [ ] `SECURITY.md` reflects the current vulnerability reporting process

### 5. Documentation

- [ ] `README.md` and `README.ja.md` are up to date
- [ ] JSDoc for public API surface is complete
- [ ] `docs/snippets/manifest.json` covers README files with TypeScript examples
- [ ] `docs/snippets/` mirrors README code examples and passes `pnpm docs:typecheck`
- [ ] `examples/` still compile and run against the new version
- [ ] `scripts/public-api-manifest.json` covers intentional public exports
- [ ] `pnpm metadata:check` passes before publish

### 6. npm Publish

```bash
pnpm pack:dry-run
```

Publishing is handled by `.github/workflows/release.yml` through Changesets.
Manual npm publish is only for emergency recovery and must follow
`docs/release-operations.md`.

### 7. GitHub Release

```bash
gh release create v<version> --title "v<version>" --notes-file RELEASE_NOTES.md
```

### 8. Post-publish

- [ ] Verify npm package pages show correct version
- [ ] Run install + quickstart against the published package in a clean project
- [ ] Update Zenn article drafts if API changed
- [ ] Post X announcement for minor/major versions

## Zenn Article Checklist

Before publishing a Zenn article:
- [ ] All code examples use the latest published version
- [ ] `npm install @sugukuru/gmo-aozora-sdk@<version>` command is correct
- [ ] Links to GitHub source point to the tagged release, not `main`
- [ ] Comparison table is current (cross-reference `competitive-positioning.md`)
