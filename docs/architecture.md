# Architecture

## Package Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                    Consumer Application                       │
└─────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌──────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│ @sugukuru/       │  │ @sugukuru/         │  │ @sugukuru/         │
│ gmo-aozora-sdk   │  │ zengin-format      │  │ gmo-aozora-webhook │
│ (packages/core)  │  │ (packages/zengin-  │  │ (packages/webhook) │
│                  │  │  format)           │  │                    │
│ OAuth + HTTP     │  │ Zengin file        │  │ HMAC-SHA256        │
│ Corporation API  │  │ generation         │  │ verification       │
│ Typed errors     │  │ (any JP bank)      │  │ Zod event parsing  │
└──────────────────┘  └────────────────────┘  └────────────────────┘
          │
          ▼
   GMO Aozora Open API
   (api.gmo-aozora.com)
```

**Key constraint**: `@sugukuru/zengin-format` and `@sugukuru/gmo-aozora-webhook` do NOT import from `@sugukuru/gmo-aozora-sdk`. They are independent packages that work with any Japanese bank or webhook provider using the same standards.

## Request Lifecycle

```
Consumer code
    │
    ▼
GmoAozoraClient.useUser(userId)          ← returns GmoAozoraUserClient
    │
    ▼
GmoAozoraUserClient.corporation.balances.get(accountId)
    │
    ▼
OAuthClient.getAccessToken(userId)       ← proactive refresh at T-60s
    │ (token injected into request headers)
    ▼
HttpClient.get('/accounts/balances', { schema, query })
    │  ├── Rate limiter (token bucket, 10 tokens / 10 per second default)
    │  ├── Retry with exponential backoff (default maxRetries: 2, base 500ms)
    │  ├── Timeout (30s default — surfaces as GmoAozoraTimeoutError)
    │  ├── Request ID header (UUIDv7, x-request-id)
    │  └── Auth header (x-access-token: <token>)
    │
    ▼
HTTP: GET /ganb/api/corporation/v1/accounts/balances
    │
    ▼
Response → Zod schema validation (GetBalancesResponseSchema)
    │  └── Throws GmoAozoraValidationError on schema mismatch
    │
    ▼
Typed result: Balance | undefined
```

## Retry and Rate Limiting

The `HttpClient` implements production-grade resilience:

**Retry** (`maxRetries: 2` by default — total 3 attempts including the initial one):
- Retries on `429` and `5xx` responses, plus network/`fetch` rejections
- Respects `Retry-After` header (delta-seconds or HTTP-date), capped at 60s; falls back to exponential backoff when the header is absent or unparsable
- Exponential backoff baseline: `[500ms, 1000ms, 2000ms]` per attempt with up to 10% jitter
- 401 triggers exactly one in-flight token refresh + retry, independent of `maxRetries`
- Does NOT retry on other `4xx` errors (client errors are not transient)

**Rate Limiting** (token bucket, `maxTokens: 10`, `refillRatePerSecond: 10`):
- Each request consumes one token before the network call
- Tokens refill at 10/second up to a 10-token burst, matching GMO Aozora's documented guideline
- Requests await the next token rather than failing immediately
- Prevents hitting GMO's API rate limits on bulk operations

## Error Class Hierarchy

```
Error
└── GmoAozoraError                    (base — all SDK errors extend this)
    ├── GmoAozoraApiError             (HTTP 4xx and uncategorized network errors)
    │     fields: code, message, requestId, status
    │     codes include: HTTP_<status>, NETWORK_ERROR, GMO error codes
    ├── GmoAozoraServerError          (HTTP 5xx after retries are exhausted)
    │     fields: status, message, requestId
    ├── GmoAozoraAuthError            (OAuth / token failures, 401 handling)
    │     fields: code (UNAUTHORIZED | REFRESH_FAILED | ...)
    ├── GmoAozoraStateMismatchError   (PKCE state mismatch on exchangeCode)
    ├── GmoAozoraValidationError      (Zod schema mismatch on response or input)
    │     fields: issues (ZodIssue[])
    └── GmoAozoraTimeoutError         (AbortError after timeoutMs, polling timeout)
          fields: message
```

All retriable network failures that exhaust `maxRetries` surface as
`GmoAozoraApiError` with `code: 'NETWORK_ERROR'`. Use `instanceof` to discriminate.

## OAuth PKCE Flow

```
1. client.buildAuthorizationUrl(scopes)
      └── Generates code_verifier (43-128 bytes, crypto.randomBytes)
      └── Computes code_challenge = BASE64URL(SHA256(verifier))
      └── Generates state (32 bytes, crypto.randomBytes)

2. User redirected to GMO authorization URL

3. GMO redirects back with ?code=...&state=...

4. userClient.exchangeCode({ code, state, session })
      └── Verifies state matches session.state
      └── POST /token with code_verifier
      └── Stores TokenSet in TokenStorage

5. Subsequent API calls: OAuthClient.getAccessToken()
      └── Loads tokens from storage
      └── If expiresAt - now < 60s → proactive refresh
      └── Returns valid access token
```

## Zengin File Structure

```
buildZenginFile(input) → Buffer
│
├── Header record   (120 bytes) ─── レコード区分 '1'
│     Remitter info, transfer date, source bank account
│
├── Data records    (120 bytes each) ─── レコード区分 '2'
│     One per recipient: bank code, branch, account, amount
│
├── Trailer record  (120 bytes) ─── レコード区分 '8'
│     Total count and total amount (checksums)
│
└── End record      (120 bytes) ─── レコード区分 '9'
      Fixed terminator

Total: (N + 3) × 120 bytes
Encoding: Shift_JIS (ASCII + half-width katakana subset)
```
