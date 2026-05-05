# Security

## Token Storage

**Never** store access tokens in plaintext. The SDK provides a `TokenStorage` interface that must be implemented with a secure backend in production.

```typescript
// ✅ Production: KMS-backed storage (implement TokenStorage interface)
import type { TokenStorage, TokenSet } from '@sugukuru/gmo-aozora-sdk';

class KmsTokenStorage implements TokenStorage {
  async save(userId: string, tokens: TokenSet): Promise<void> {
    const encrypted = await kms.encrypt(JSON.stringify(tokens));
    await db.upsert({ userId, encrypted });
  }
  async load(userId: string): Promise<TokenSet | null> {
    const row = await db.findOne({ userId });
    if (!row) return null;
    return JSON.parse(await kms.decrypt(row.encrypted)) as TokenSet;
  }
  async delete(userId: string): Promise<void> {
    await db.delete({ userId });
  }
}

// ❌ Development only — tokens lost on restart, never use in production
const storage = new InMemoryTokenStorage();
```

Token lifetimes:
- Access tokens: ~1 hour
- Refresh tokens: up to 90 days

The SDK proactively refreshes access tokens at **T-60 seconds** before expiry to avoid mid-request expiry.

## OAuth PKCE

The SDK exclusively uses **S256 PKCE** (Proof Key for Code Exchange):

- Code verifier: 43–128 cryptographically random bytes (`crypto.randomBytes`)
- Code challenge: `BASE64URL(SHA256(verifier))` — the `plain` method is never used
- State parameter: 32 cryptographically random bytes
- Authorization codes and code verifiers are **never logged**

## Log Redaction

The `ConsoleLogger` (and any Logger implementation) automatically redacts sensitive fields before output via `redactLogMeta()`:

Redacted fields: `accessToken`, `refreshToken`, `authorization`, `x-access-token`, `cookie`, `password`, `secret`, `clientSecret`, `code`, `codeVerifier`

```typescript
// This will log { url: '...', accessToken: '[REDACTED]' }
logger.debug('API request', { url: '/balances', accessToken: 'tok-123' });
```

**Never log raw HTTP request/response bodies** — they may contain PII or token values.

## Webhook HMAC Verification

The webhook package uses `crypto.timingSafeEqual` for signature comparison. This is **mandatory** — using `===` is vulnerable to timing attacks:

```typescript
import { verifyWebhookSignature } from '@sugukuru/gmo-aozora-webhook';

// ✅ Timing-safe comparison
const isValid = verifyWebhookSignature({
  rawBody: req.body, // Buffer — read BEFORE JSON.parse()
  signature: req.headers['x-webhook-signature'], // base64-encoded HMAC-SHA256
  secret: process.env.WEBHOOK_SECRET,
});

// ❌ Vulnerable to timing attacks — NEVER do this
if (computedHmac === req.headers['x-webhook-signature']) { ... }
```

**Critical**: Always read the raw body as a `Buffer` **before** JSON parsing. Once parsed, you cannot reconstruct the exact bytes that were signed. Use `express.raw({ type: 'application/json' })` before the webhook middleware. The middleware rejects non-`Buffer` bodies instead of trying to rebuild bytes with `JSON.stringify`.

## TLS

- All production URLs are HTTPS (`api.gmo-aozora.com`)
- Never set `NODE_TLS_REJECT_UNAUTHORIZED=0`
- Never pass `{ rejectUnauthorized: false }` to fetch options

## Secrets in Code

- No hardcoded credentials — ever
- `.env` files for local development only (enforced by `.gitignore`)
- Tests use `InMemoryTokenStorage` with fixture tokens, never real credentials

## Dependency Audits

`pnpm run verify` runs `pnpm audit --audit-level high` and only fails the
build on `high` or `critical` advisories. This is intentional:

- **Runtime dependencies** are deliberately minimal (Zod only). They are
  watched for any vulnerability at any severity and bumped immediately.
- **Dev dependencies** (vitest, vite, esbuild, tsup, etc.) are not shipped
  to consumers — only `dist/` is published. Moderate-severity advisories
  in dev tooling that affect only the local dev server (e.g. Vite/esbuild
  CORS or path traversal in dev mode) are tracked but do not block release.
- Run `pnpm audit` (without `--audit-level high`) to see the full list at
  any time. Run `pnpm why <pkg>` to confirm the dependency path before
  acting on a finding.

## Security Reporting

See [SECURITY.md](../SECURITY.md) for the vulnerability disclosure process.
