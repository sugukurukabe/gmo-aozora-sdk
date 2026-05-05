# Changesets

This folder is used by [changesets](https://github.com/changesets/changesets) to manage releases.

## How to add a changeset

When making a change that should be released:

```bash
pnpm changeset
```

Follow the interactive prompts to select affected packages and describe the change.

## How releases work

1. Add a changeset: `pnpm changeset`
2. Commit the changeset file along with your code changes
3. The CI release workflow will open a "Version Packages" PR
4. Merge the PR to publish to npm
