# Examples

Runnable TypeScript examples demonstrating common SDK patterns. All examples target the **sunabar** (sandbox) environment — no real money is transferred.

## Setup

```bash
# Install all workspace dependencies first
pnpm install

# Run any example with pnpm exec tsx (resolves workspace packages correctly)
pnpm exec tsx examples/<example-name>.ts
```

## どれを選べばいいか

| 状況 | 使うファイル |
|---|---|
| アクセストークンをすでに持っている（Sunabar ポータル等で取得済み） | `balance-check.ts` |
| ブラウザでログインして OAuth フローを通したい | `oauth-callback-server.ts` |
| 取引明細を全件取得したい | `transactions-iterate.ts` |
| 給与振込バッチを実行したい | `payroll-batch.ts` |
| Webhook 署名検証サーバーを立てたい | `webhook-express.ts` |
| 認証情報なしで SDK の動作確認だけしたい | `sunabar-dry-run.ts` |

---

## Examples

### `balance-check.ts` — トークン直接使用（最も簡単）

すでにアクセストークンを持っている場合の最短パターン。

**Env vars:** `GMO_ACCESS_TOKEN`, `GMO_ACCOUNT_ID`, `GMO_CLIENT_ID`（任意）

```bash
GMO_ACCESS_TOKEN=your-sunabar-token \
GMO_ACCOUNT_ID=your-account-id \
pnpm exec tsx examples/balance-check.ts
```

---

### `oauth-callback-server.ts` — 完全な OAuth ログインフロー

ブラウザで GMO Aozora にログインする OAuth 2.0 PKCE フローの完全実装。
1. `http://localhost:8080/login` にアクセスして認可画面へリダイレクト
2. ログイン後にコールバックを受け取ってトークン交換
3. 残高を取得して表示

**Env vars:** `GMO_CLIENT_ID`, `GMO_CLIENT_SECRET`, `GMO_ACCOUNT_ID`

> 開発者ポータルに Redirect URI `http://localhost:8080/callback` を登録してください。

```bash
GMO_CLIENT_ID=xxx \
GMO_CLIENT_SECRET=yyy \
GMO_ACCOUNT_ID=zzz \
pnpm exec tsx examples/oauth-callback-server.ts
# → ブラウザで http://localhost:8080/login を開く
```

---

### `transactions-iterate.ts`

Streams all transactions for an account using `for await...of`. Handles cursor-based pagination (`nextItemKey`) transparently.

**Env vars:** `GMO_ACCESS_TOKEN`, `GMO_ACCOUNT_ID`, `GMO_DATE_FROM` (optional), `GMO_DATE_TO` (optional)

```bash
GMO_ACCESS_TOKEN=your-token \
GMO_ACCOUNT_ID=your-id \
pnpm exec tsx examples/transactions-iterate.ts
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
WEBHOOK_SECRET=your-hmac-secret pnpm exec tsx examples/webhook-express.ts
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

```bash
# 認証情報不要のドライラン
pnpm sunabar:dry-run

# 実際に API を呼ぶ（read-only）
GMO_ACCESS_TOKEN=... GMO_ACCOUNT_ID=... pnpm sunabar:readonly
```

This example never persists tokens to disk and never logs raw secrets.

## Type-checking examples

```bash
pnpm examples:typecheck
```

## Notes

- Examples use `InMemoryTokenStorage` — **not for production**. In production, use a KMS-backed implementation of the `TokenStorage` interface.
- The `payroll-batch.ts` example writes a `.dat` file to the current directory. Add `*.dat` to `.gitignore` in your project.
- Examples are not part of the main build (`pnpm -r build`). They're documentation that happens to typecheck.
