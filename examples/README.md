# Examples

Runnable TypeScript examples demonstrating common SDK patterns. All examples target the **sunabar** (sandbox) environment — no real money is transferred.

## Setup

```bash
# Install all workspace dependencies first
pnpm install

# Run any example with tsx (no build step needed)
npx tsx examples/<example-name>.ts
```

## Examples

### `balance-check.ts`

Fetches the current book and available balance for a single account.

**Env vars:** `GMO_CLIENT_ID`, `GMO_ACCOUNT_ID`, `GMO_ACCESS_TOKEN`

```bash
GMO_ACCESS_TOKEN=your-sunabar-token GMO_ACCOUNT_ID=your-account-id npx tsx examples/balance-check.ts
```

---

### `transactions-iterate.ts`

Streams all transactions for an account using `for await...of`. Handles cursor-based pagination (`nextItemKey`) transparently.

**Env vars:** `GMO_CLIENT_ID`, `GMO_ACCOUNT_ID`, `GMO_ACCESS_TOKEN`, `GMO_DATE_FROM` (optional), `GMO_DATE_TO` (optional)

```bash
GMO_ACCESS_TOKEN=your-token GMO_ACCOUNT_ID=your-id npx tsx examples/transactions-iterate.ts
```

---

### `payroll-batch.ts`

Full production payroll flow:
1. Build a Zengin format `.dat` file using `@sugukuru/zengin-format` for audit archiving
2. Submit a `bulkTransfers.create()` request with the same data
3. Poll for the final result using `bulkTransfers.pollResult()`

**Env vars:** `GMO_CLIENT_ID`, `GMO_ACCOUNT_ID`, `GMO_ACCESS_TOKEN`

> Note: Edit the `employees` array in the file with real employee bank data.

---

### `webhook-express.ts`

Express server that receives `va-deposit-transaction` webhook events:
- Uses `express.raw()` to read the raw body as a Buffer
- Verifies the HMAC-SHA256 signature with `webhookMiddleware`
- Parses and validates the event with Zod schemas

**Env vars:** `WEBHOOK_SECRET`, `PORT` (optional, default 3000)

```bash
WEBHOOK_SECRET=your-hmac-secret npx tsx examples/webhook-express.ts
```

Test with curl (see file header for the full test command).

---

### `sunabar-dry-run.ts`

Credential-safe harness for Sunabar (sandbox) validation. By default it runs
in **dry-run mode**: it instantiates `GmoAozoraClient`, builds a PKCE S256
authorization URL, and prints what would be requested — without making any
network calls. Pass `--execute-readonly` together with `GMO_ACCESS_TOKEN`
and `GMO_ACCOUNT_ID` to perform a single read-only `accounts.list` and
`balances.get` call.

**Dry run (no network):**

```bash
npx tsx examples/sunabar-dry-run.ts
```

**Read-only execution (Sunabar):**

```bash
GMO_CLIENT_ID=... \
GMO_CLIENT_SECRET=... \
GMO_ACCESS_TOKEN=... \
GMO_ACCOUNT_ID=... \
npx tsx examples/sunabar-dry-run.ts --execute-readonly
```

This example never persists tokens to disk and never logs raw secrets.

## Type-checking examples

```bash
pnpm exec tsc --project examples/tsconfig.json
```

## Notes

- Examples use `InMemoryTokenStorage` — **not for production**. In production, use a KMS-backed implementation of the `TokenStorage` interface.
- The `payroll-batch.ts` example writes a `.dat` file to the current directory. Add `*.dat` to `.gitignore` in your project.
- Examples are not part of the main build (`pnpm -r build`). They're documentation that happens to typecheck.
