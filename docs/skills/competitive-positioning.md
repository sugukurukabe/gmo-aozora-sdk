# Competitive Positioning

> **Purpose**: When in doubt about whether a feature or change preserves our
> market positioning, read this skill.

## Market Snapshot (2026-05)

| Capability | Official Node SDK | Other JP banks | **This SDK** |
|---|---|---|---|
| Language | JS, Node 10+ | no SDK | **TypeScript 100%** |
| Zod validation | ❌ | ❌ | ✅ |
| Auto retry / rate limit | ❌ | ❌ | ✅ |
| Zengin file generation | ❌ | ❌ | ✅ |
| Compile-time shorui validation | ❌ | ❌ | ✅ |
| Webhook HMAC verification | manual | ❌ | ✅ |
| Cloud KMS token storage | ❌ | ❌ | ✅ |
| Production usage evidence | unknown | unknown | **150+ payroll/month** |

## Our 3 Advantages (must protect)

### 1. Production-grade TypeScript

- Zod v4 validation on all API inputs/outputs
- Auto-retry with exponential backoff + jitter
- Rate limiting via token bucket
- Cloud KMS token storage (no plaintext tokens)
- HMAC-SHA256 webhook verification with `timingSafeEqual`
- Idempotency keys (UUIDv7)

### 2. Domain Helpers

- `ZenginShorui = '11' | '12'` — compile-time payroll/bonus distinction
- `ResidenceStatus` 4-state model (valid / tokurei_kikan / expired_no_app / overdue)
- 3-track response builder (execute / stop_work / refer_immigration)
- Half-width kana converter with full banking conventions

### 3. MCP Ecosystem Ready

- Designed to plug into freee MCP, sugukuru-core MCP, future SSW Compass
- Token storage interface supports MCP-server-friendly state management
- Examples include MCP Apps integration patterns

## Threats to Monitor

### Threat A: Official SDK major upgrade

Mitigation: maintain higher type safety + extend domain helpers (other SDKs
won't replicate compliance logic) + stay ahead with Zod/Node features.

### Threat B: Copycat TypeScript SDK appears

Mitigation: get to 100+ Stars and 200+ DL/week before competition arrives.
Lock in sunabar community Zenn references. Push for GMO official recognition.

### Threat C: GMO releases an official TypeScript SDK

Mitigation: maintain domain helpers (Zengin, residence) they won't add.
Position as "the SDK for Japanese-business contexts" vs "the official base."
Possibly contribute back as a reference implementation.

## When to invoke this skill

- Before deciding whether to ship a feature
- Before agreeing to a controversial PR
- Before making a versioning decision
- Before writing marketing copy or Zenn articles
