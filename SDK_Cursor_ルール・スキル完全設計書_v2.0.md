# @sugukuru/gmo-aozora-sdk
## Cursor ルール・スキル完全設計書 v2.0（強化版）

> **改訂理由**：v1.0 で作った「Cursor が普通の OAuth クライアントを作らないようにする」設計に、SDK 比較表で明確になった**差別化ポジションを侵食させないための専用ルール**を追加。
> **v1.0 → v2.0 の主な追加**：
> - 比較表ベースの「差別化禁則ルール」（Day 2 以降の Cursor 暴走を防ぐ最重要層）
> - Self-check ルール（Cursor 自身に自分の仕事を検証させる）
> - GMO 公式 SDK 模倣禁止ルール（負の参照例として明示）
> - 多言語対応設計の早期予防（v2.0 抽象化レイヤーへの布石）
> - Sunabar コミュニティ受け入れ性ルール（PR で生き残る品質）
>
> **作成日**：2026-05-04
> **準拠**：Cursor 2.2+（MDC、ネスト AGENTS.md）、Cursor Rules best practices 2026、Datacamp / Morph 推奨

---

## 0. 比較表が突きつけた現実と、ルール設計への影響

### 0.1 比較表の戦略的読み替え

比較表で明らかになった**3つの絶対優位**：

```
1. 技術的優位性 (Production-grade TS)
   公式 Node SDK (Node 10+, JS, no Zod, no retry) を凌駕
   → Cursor がカジュアルに「公式SDK風」を書くと優位性が消える

2. ドメイン特化 (派遣業×特定技能)
   '11' | '12' Union 強制、3トラック compliance helper
   → Cursor が「shorui を string で受け取る」と一瞬で崩れる

3. エコシステム構築力 (MCP連携前提)
   freee / sugukuru-core / SSW Compass との設計上の整合
   → Cursor が独自進化すると将来の統合で詰む
```

**Cursor は何も言わなければ、もっとも一般的なパターン（=公式 SDK 模倣）を書く**。これが SDK の3つの優位性すべてを侵食します。だから**ルールは「禁則」を明確にする**ことが最重要。

### 0.2 v1.0 に欠けていた視点

v1.0 のルール（mission / typescript-style / security / oauth-pkce 等）は**「正しいパターンを教える」**側面が強かった。v2.0 では：

- **「やってはいけないパターン」を比較表ベースで明文化**
- **「迷ったらどう自己チェックするか」を Cursor に教える**
- **「将来の v2.0 で抽象化する箇所を予告」してダウンキャストを防ぐ**

これらを v1.0 設計書 §3-§7 のルール群に**追加層**として乗せます。

---

## 1. v2.0 で追加する5つの新ルール

### 1.1 全体マップ

```
v1.0 から既存:
├── 00-mission.mdc
├── 01-typescript-style.mdc
├── 02-security-and-secrets.mdc
├── 10-oauth-pkce.mdc
├── 11-http-layer.mdc
├── 12-corporation-api.mdc
├── 13-zengin-format.mdc
├── 14-webhook.mdc
├── 20-testing.mdc
├── 21-error-handling.mdc
├── 30-zod-v4.mdc
├── 31-undici-fetch.mdc
├── 32-mcp-apps-ui.mdc
├── 40-gmo-api-spec.mdc           Manual
├── 41-zengin-spec.mdc            Manual
└── 42-compliance.mdc             Manual

v2.0 で追加:
├── 03-differentiation-guard.mdc          Always ★最重要
├── 04-self-check-protocol.mdc            Always
├── 50-anti-patterns-from-official.mdc    Manual @anti-patterns
├── 51-multi-bank-readiness.mdc           Manual @multi-bank
└── 52-community-pr-quality.mdc           Manual @pr-ready
```

3つの Always 追加（+1 ファイルが既存 02 を強化）、2つの Manual 追加。**Always 追加で 600 トークン増**するが、**v1.0 の 02-security に内包されていた重複を整理**するので最終トークン数は同程度。

---

## 2. `03-differentiation-guard.mdc` — **最重要追加ルール**

**役割**：比較表で明確になった3つの絶対優位を、コードレベルで侵食させない。

```markdown
---
description: Differentiation guards based on competitive analysis (vs official Node SDK and other Japanese banks)
alwaysApply: true
---

# Differentiation Guards

This SDK is the world's first **production-grade TypeScript SDK** for GMO Aozora.
Every other option in the market (as of 2026-05) lacks at least one of:
- TypeScript-first design with full Zod validation
- Domain-specific helpers (Zengin, residence-aware payroll)
- Production defaults (retry, rate limiting, KMS storage)

**Your mistakes can erode all three advantages in a single PR.**
This rule lists the patterns Cursor must NEVER write.

## Forbidden Pattern 1: "Official-SDK style" (loses TS advantage)

The official `gmo-aozora-api-nodejs` is JS, Node 10+, no Zod, no retry.
We MUST be its opposite. Therefore:

- NEVER use `: any` as a parameter or return type
- NEVER use `JSON.parse(...)` without immediately validating with a Zod schema
- NEVER write `try { ... } catch { /* ignore */ }` — every error is typed
- NEVER use `console.log` — use the Logger abstraction
- NEVER fall back to plain Promises with `.then().catch()` — async/await only

If you find yourself writing code that "would work in Node 10", stop. Re-read
this rule. The whole reason this SDK exists is that we don't want to write
that code.

## Forbidden Pattern 2: Loose domain types (loses domain-specific advantage)

These types are LOAD-BEARING. Do not relax them under any circumstances:

- `ZenginShorui = '11' | '12'` — NEVER widen to `string` or accept `'21'`
- `GmoEnvironment = 'sunabar' | 'staging' | 'production'` — NEVER add free-form
- `ResidenceStatus = { kind: 'valid' } | { kind: 'tokurei_kikan' } | ...` —
  NEVER collapse to a string field

If a Cursor suggestion proposes "let's just make this a string for flexibility",
that is a **regression**. Reject it.

## Forbidden Pattern 3: Excel-friendly outputs (loses MCP-era advantage)

We are replacing Excel-driven workflows, not augmenting them.

- NEVER write functions that "export to CSV for the user to upload manually"
- NEVER add a `.toExcelRow()` helper
- NEVER suggest "the user can copy-paste this into a spreadsheet"

If a feature seems to need an Excel intermediate, the right answer is:
- Use the JSON bulk transfer API
- Or generate a `.dat` Zengin file directly with `@sugukuru/zengin-format`

## Forbidden Pattern 4: Synchronous patterns that block

- NEVER use `fs.readFileSync` outside of build scripts
- NEVER use `child_process.execSync`
- NEVER use synchronous `Buffer` operations on user input larger than 1KB

Banking operations are time-sensitive. Sync I/O blocks the event loop and
can cause webhook timeouts.

## Forbidden Pattern 5: GMO-only assumptions in shared packages

The packages `@sugukuru/zengin-format` and `@sugukuru/gmo-aozora-webhook` are
designed to work with **any Japanese bank** that uses the same standards.

In `packages/zengin-format/**`:
- NEVER hardcode "0310" (GMO Aozora's bank code)
- NEVER reference `gmoAozora` or `private:account` scopes
- NEVER import from `@sugukuru/gmo-aozora-sdk`

In `packages/webhook/**`:
- NEVER assume specific event types beyond `va-deposit-transaction`
- NEVER hardcode GMO's signature header name without parameterization

GMO-specific code belongs in `packages/core` only.

## Self-check before suggesting code

Before proposing any change, ask yourself:

1. Does this regress one of our 3 differentiation axes?
2. Does this look like something the official Node SDK would do?
3. Would this still work if a different Japanese bank adopted this package?

If "yes" to #1 or #2, or "no" to #3 (in shared packages), revise.
```

**評価**：
- 70行、約500トークン
- v1.0 の他ルールと重複なし（差別化軸の保護に特化）
- **Cursor の「無意識の defaults 化」を阻止する最強の防衛線**

---

## 3. `04-self-check-protocol.mdc` — Cursor に自己検証させる

Datacamp / Morph 2026 ベストプラクティスで強調されている「**Cursor に自分の仕事をどうチェックするかを教える**」を SDK 文脈に落とし込みます。

```markdown
---
description: Self-check protocol Cursor must run before claiming a task is done
alwaysApply: true
---

# Self-Check Protocol

After writing any code, before saying "done", run this protocol mentally.
If any check fails, fix the code, do not negotiate the criteria.

## Step 1: Type integrity

Run `pnpm typecheck` mentally on the changed files:
- Are all imports resolved?
- Do all return types match what the schema declares?
- Is `exactOptionalPropertyTypes` happy with the optional properties?
- Does the change introduce any `any`?

## Step 2: Test coverage

For every new function or class:
- Is there at least one happy-path test?
- Is there at least one failure-mode test?
- Are edge cases (empty input, max input, null vs undefined) tested?

For modified functions: did the old tests still pass logically (i.e., would
they still cover the modified behavior, or do they need updating)?

## Step 3: Differentiation guard (rule 03)

- Does this change introduce any forbidden pattern from rule 03?
- Does this change reduce type safety, even slightly?
- Does this change make the API less ergonomic than what `@sugukuru/zengin-format`
  consumers expect?

## Step 4: Spec compliance

For changes touching API client code:
- Did you check `docs/skills/gmo-aozora-api.md` for the endpoint spec?
- Are headers correct? (`x-access-token`, not Bearer)
- Is the path prefix correct? (`/ganb/api/corporation/v1/`)

For changes touching Zengin format:
- Did you verify byte length is exactly 120?
- Did you run the half-width kana converter on text fields?
- Did you check shorui is `'11' | '12'`?

For changes touching webhook code:
- Did you use `timingSafeEqual`?
- Did you read the raw body as `Buffer` (not parsed JSON)?

## Step 5: Documentation parity

- If the public API surface changed, did you update the JSDoc?
- If you added a new feature, did you suggest a CHANGELOG entry?
- If a behavior diverges from "obvious", did you add a comment explaining why?

## Step 6: Commit message

Suggest a commit message in the form:
```
<type>(<scope>): <subject>

<body explaining motivation, not just what changed>

<refs to issues, ADRs, spec sections if relevant>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`.

## When uncertain

If any check above is unclear, do NOT silently proceed. Either:
1. Ask the user explicitly
2. Or invoke the relevant manual rule (`@gmo-spec`, `@zengin-spec`, `@compliance`)
3. Or read the relevant skill in `docs/skills/`
```

**評価**：
- 75行、約550トークン
- **Cursor の「やった気になる」失敗を構造的に防ぐ**
- v1.0 の各ルールと協調動作する司令塔

---

## 4. `50-anti-patterns-from-official.mdc` — Manual `@anti-patterns`

公式 SDK の負の参照例を**意図的にコード断片で示す**。Cursor が「あれ、こういう書き方だっけ？」と迷ったときに `@anti-patterns` で呼び出します。

```markdown
---
description: Anti-patterns observed in the official Node.js SDK (negative examples)
alwaysApply: false
---

# Anti-patterns from the Official SDK

Invoke `@anti-patterns` when in doubt about whether a pattern is correct.
This rule shows what the official `gmo-aozora-api-nodejs` does, and what we
do INSTEAD.

## Anti-pattern A1: Untyped response handling

```javascript
// Official SDK style (DO NOT REPLICATE)
async function getBalance(accessToken) {
  const res = await fetch(url, { headers: { 'x-access-token': accessToken } });
  return res.json(); // Returns `any`, no validation
}
```

Our way:

```typescript
// @sugukuru/gmo-aozora-sdk style
async function getBalance(accountId: string): Promise<GetBalancesResponse> {
  return this.http.get('/ganb/api/corporation/v1/accounts/balances', {
    schema: GetBalancesResponseSchema, // Zod validates
    query: { accountId },
  });
}
```

## Anti-pattern A2: No retry, no rate limit

```javascript
// Official: just fetch once, fail on first error
const res = await fetch(url, options);
if (!res.ok) throw new Error('Request failed');
```

Our way: HttpClient handles retry (500/502/503/504/429), rate limiting
(token bucket), and 401-triggered token refresh. See `packages/core/src/http/`.

## Anti-pattern A3: Hardcoded string parameters everywhere

```javascript
// Official: shorui codes as strings, no validation
generateZenginFile({ shorui: '11', ... }); // OK
generateZenginFile({ shorui: '21', ... }); // ALSO compiles, BUG
generateZenginFile({ shorui: 'eleven', ... }); // ALSO compiles, BUG
```

Our way:

```typescript
// @sugukuru/zengin-format
import { ZENGIN_SHORUI } from '@sugukuru/zengin-format';
generateZenginFile({ shorui: ZENGIN_SHORUI.KYUYO, ... }); // ✅ '11' for payroll
generateZenginFile({ shorui: ZENGIN_SHORUI.SHOYO, ... }); // ✅ '12' for bonus
generateZenginFile({ shorui: '21', ... }); // ❌ Type error: '21' not in '11' | '12'
```

## Anti-pattern A4: Webhook verification with `==`

```javascript
// Official-ish style: vulnerable to timing attacks
function verify(body, signature, secret) {
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64');
  return signature === expected; // ❌ NEVER use ==
}
```

Our way:

```typescript
// @sugukuru/gmo-aozora-webhook
import { timingSafeEqual } from 'node:crypto';

function verify(rawBody: Buffer, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  const actual = Buffer.from(signature, 'base64');
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual); // ✅ Constant-time
}
```

## Anti-pattern A5: Synchronous file I/O during webhook handling

```javascript
// Official (or naive): blocks event loop
app.post('/webhook', (req, res) => {
  const log = fs.readFileSync('webhook.log', 'utf8'); // ❌ blocks
  // ...
});
```

Our way:

```typescript
// Async logger, never block the request handler
app.post('/webhook', async (req, res) => {
  await logger.info('webhook_received', { eventType });
  // ...
});
```

## When to invoke this rule

Invoke `@anti-patterns` when:
- You're about to copy-paste a pattern from a tutorial
- You're not sure if a "simpler" version of the code is acceptable
- You're tempted to "just match what the official SDK does"

Cursor: if the user invokes `@anti-patterns`, treat it as a hard signal to
review your suggestion against this rule before finalizing.
```

**評価**：
- 約100行、~700 トークン（Manual なので Always トークン予算には影響なし）
- **負の参照例を具体コードで示す**ことで、Cursor が「あ、これは官製SDK風だ」と即気付ける
- 比較表の差別化を**コードレベルで強制**

---

## 5. `51-multi-bank-readiness.mdc` — Manual `@multi-bank`

将来の v1.2 で他行抽象化を導入する布石。現在のコードがそれを妨げないようにする。

```markdown
---
description: Patterns that prepare for v1.2's multi-bank abstraction layer
alwaysApply: false
---

# Multi-Bank Readiness

## Why this matters now

v1.0 supports only GMO Aozora. v1.2 (Q4 2026) will introduce an abstraction
layer for other Japanese banks (SMBC, MUFG, regional banks) that use the
same Zengin standard.

If we lock GMO-specific assumptions into the wrong places now, v1.2 becomes
a major rewrite. So:

## Where GMO-specific code is OK

- `packages/core/src/**` — entirely GMO-specific, no abstraction needed yet
- Examples folder — fine to be GMO-only
- Documentation — fine to be GMO-centric

## Where GMO-specific code is NOT OK

- `packages/zengin-format/**` — must work for any Japanese bank
- `packages/webhook/**` — generic HMAC-SHA256 verification, parameterized headers

## Patterns that prepare for v1.2

### Bank info as injected data

```typescript
// ❌ Bad: hardcoded GMO Aozora
const sourceBank = { code: '0310', nameKana: 'ｼﾞｰｴﾑｵｰｱｵｿﾞﾗ' };

// ✅ Good: caller provides
function generateZenginFile({ sourceBank, ... }: { sourceBank: BankInfo, ... }) {
  // Uses sourceBank.code and sourceBank.nameKana directly
}
```

### Webhook header configurability

```typescript
// ❌ Bad: GMO-only
const signature = req.header('x-webhook-signature');

// ✅ Good: configurable
const verifier = createWebhookVerifier({
  signatureHeader: 'x-webhook-signature', // GMO default
  algorithm: 'sha256',
});
```

### API client interface (for v1.2 abstraction)

In v1.2, we may want:

```typescript
interface JapaneseBankClient {
  getBalance(accountId: string): Promise<Balance>;
  createBulkTransfer(input: BulkTransferInput): Promise<BulkTransferResult>;
}

class GmoAozoraClient implements JapaneseBankClient { ... }
class SmbcClient implements JapaneseBankClient { ... }
```

So in v1.0:
- Keep method names generic (`getBalance`, not `gmoAozoraBalance`)
- Keep input/output types in `@sugukuru/japanese-banking-types` (TBD package)
  if you find them naturally generic

## What NOT to do prematurely

- Don't actually create the abstraction layer in v1.0 — that's premature
- Don't add `BankProvider` interfaces just because you might need them
- Don't accept PRs that add SMBC support before v1.0 is shipped

The goal is: when v1.2 abstraction work begins, it's a **library extension**,
not a **rewrite**.

## Invoke when

- You're tempted to add `gmoAozora`-prefixed types in shared packages
- You're designing a new feature in `zengin-format` or `webhook`
- You're considering whether to publish a type in a separate package
```

**評価**：
- 約90行、~650トークン（Manual）
- **将来の業界標準化への布石**を v1.0 段階から打つ
- 比較表のロードマップ提案（v1.2 多銀行抽象化）を実装で支える

---

## 6. `52-community-pr-quality.mdc` — Manual `@pr-ready`

sunabar コミュニティで PR を受け入れる側に立つときの品質基準。Cursor が「コミュニティ向け OSS 品質」を理解していないと、PR レビューで甘くなったり厳しすぎたりします。

```markdown
---
description: PR review quality bar for sunabar community contributions
alwaysApply: false
---

# Community PR Quality Bar

This SDK is OSS targeting the sunabar community (developers using GMO Aozora's
sandbox). PRs from external contributors must meet the same bar as internal
changes, but with extra empathy.

## Acceptance criteria for any PR

A PR is "ready to merge" when:

- [ ] CI is green (typecheck, test, build, lint)
- [ ] CHANGELOG entry added via `pnpm changeset`
- [ ] Tests cover new behavior (happy path + at least one failure mode)
- [ ] No regression of differentiation guards (rule 03)
- [ ] Documentation updated if public API changed
- [ ] No new dependencies without justification
- [ ] Commit messages follow Conventional Commits

## Review tone

When reviewing community PRs (Cursor, please follow this):

- Start with what's good ("Thanks for adding the X feature, this is great")
- Be specific about required changes ("Could you add a test for the case where Y is empty?")
- Cite the relevant rule when rejecting ("Per rule 03, we cannot widen `ZenginShorui`")
- Suggest alternatives, don't just say "no" ("Instead, could you use the discriminated union pattern?")
- End with appreciation ("Looking forward to v0.6 with this!")

## Edge cases that need extra scrutiny

### Edge case 1: PRs that "simplify" types

Pattern:
> "I noticed `ZenginShorui` is `'11' | '12'`. I changed it to `string` for
> flexibility."

Response: **REJECT** with reference to rule 03 and 13. This is a regression.

### Edge case 2: PRs that add SMBC/Mizuho support directly

Pattern:
> "I added MizuhoClient that uses your patterns!"

Response: **CLOSE without merging**, but thank the contributor. Explain that
multi-bank support is v1.2 territory, and we need v1.0 stable first.
Encourage them to maintain a separate package for now (link to `@your/mizuho-bank-sdk`).

### Edge case 3: PRs that add features Sugukuru doesn't use

Pattern:
> "I added Visa debit support for our use case."

Response: **CONSIDER carefully**. We can accept if:
- The feature is in our roadmap
- Test coverage matches our standard
- The contributor commits to maintenance

If the feature is one-off, suggest a separate `@contributor/visa-debit-extension`
package.

### Edge case 4: PRs from people who clearly haven't read the docs

Pattern:
> "Why does this throw `GmoAozoraStateMismatchError`?"

Response: Patiently link to `docs/architecture.md` and the relevant rule.
Treat every "obvious" question as a docs improvement opportunity.

## Cursor: when reviewing a PR

If the user asks you to review a PR:

1. Read the diff entirely
2. Run mental typecheck and test
3. Check against rules 03, 13, 14
4. Suggest improvements in the tone above
5. Identify if any rule should be added (recurring confusion = new rule)
```

**評価**：
- 約75行、~550トークン（Manual）
- **OSS 運営者目線をルール化**することで、コミュニティ運営の質を保つ
- v1.0 リリース後の PR 受け入れ準備として最重要

---

## 7. v1.0 設計の修正（既存ルールへの追加）

### 7.1 `00-mission.mdc` への追加（数行）

v1.0 末尾に以下を追加：

```markdown
## Differentiation reminder

We are not just "another SDK." We are the only production-grade TypeScript
option in the GMO Aozora ecosystem. Our value comes from:

1. Type safety (Zod, Union types)
2. Production defaults (retry, KMS, polling)
3. Domain helpers (Zengin, residence-aware payroll)

If you suggest code that any of these axes weaken, you are eroding our
reason to exist. Consult rule 03 (`differentiation-guard`) before proposing
changes that touch types, defaults, or domain helpers.
```

### 7.2 `13-zengin-format.mdc` の強化

現行に追加：

```markdown
## Multi-bank readiness

This package must NOT contain GMO-specific code. Specifically:

- ❌ Hardcoded "0310" (GMO Aozora's bank code) — use the `sourceBank` parameter
- ❌ Imports from `@sugukuru/gmo-aozora-sdk`
- ❌ Mentions of `private:account` or other GMO scope names

If you need GMO-specific behavior, write it in `packages/core` and have
the user wire it together at the application level.

## Reference: rule 51

Before adding any new exported function, invoke `@multi-bank` to verify
the function would still work for SMBC, MUFG, regional banks etc.
```

### 7.3 `20-testing.mdc` の強化（v1.0 で軽く触れていたところ）

現行に追加：

```markdown
## Test naming conventions

Use descriptive Japanese-friendly test names where appropriate:

```typescript
// ✅ Good: clearly describes scenario in domain language
it("特例期間中（適法）の場合、給与振込を実行する", async () => { ... });

// ✅ Good: covers a regression
it("rejects shorui '21' at compile time (regression: was Day 1 bug)", () => {
  // @ts-expect-error - shorui must be '11' | '12'
  generateZenginFile({ shorui: '21' });
});

// ❌ Bad: vague
it("works", () => { ... });
```

## Test fixtures organization

Banking samples in `fixtures/{bank-name}-sample-{purpose}.dat`:

```
fixtures/
├── hirogin-sample-kyuyo.dat      Hiroshima Bank payroll sample
├── gunma-sample-kyuyo.dat        Gunma Bank payroll sample
├── oita-sample-kyuyo.dat         Oita Bank payroll sample
└── kiraboshi-sample-kyuyo.dat    Kiraboshi Bank payroll sample
```

Always cite the source PDF URL in the test file's header comment.

## Snapshot tests

For Zengin file output, use binary-equality assertions, not snapshot files:

```typescript
expect(result.buffer).toEqual(expected); // ✅ Buffer equality
expect(result.buffer.toString('hex')).toMatchSnapshot(); // ❌ Encoding-dependent
```
```

---

## 8. `docs/skills/` の強化

v1.0 で4ファイル提案していたものに、**比較表ベースの戦略文書**を追加します。

### 8.1 新規追加：`docs/skills/competitive-positioning.md`

```markdown
# Competitive Positioning

> **Purpose**: When in doubt about whether a feature/change preserves our
> market positioning, read this skill.

## Snapshot of the market (as of 2026-05)

| Bank/SDK | Language | Zengin? | Compliance helpers? | Production-grade? |
|---|---|---|---|---|
| GMO Aozora official `gmo-aozora-api-nodejs` | JS, Node 10+ | ❌ | ❌ | minimal |
| MUFG / SMBC / Mizuho | (no SDK) | ❌ | ❌ | ❌ |
| **@sugukuru/gmo-aozora-sdk** | **TS 100%, Zod v4** | **✅ Union '11'\|'12'** | **✅ 4-state model** | **✅ Retry / RateLimit / KMS / Polling** |

## Our 3 advantages (must protect)

### 1. Production-grade TypeScript
- Zod v4 validation everywhere
- Auto-retry with backoff
- Rate limiting (token bucket)
- Cloud KMS Token Storage
- HMAC-SHA256 webhook verification
- Idempotency keys (UUIDv7)

### 2. Domain helpers
- `ZenginShorui = '11' | '12'` — compile-time payroll/bonus distinction
- `ResidenceStatus` 4-state model (valid / tokurei_kikan / expired_no_app / overdue)
- 3-track response builder (pay earned wages / stop work / refer to immigration)
- Half-width kana converter with banking conventions

### 3. MCP ecosystem ready
- Designed to plug into freee MCP, sugukuru-core MCP, future SSW Compass
- Examples include MCP Apps integration patterns
- Token storage interface allows MCP-server-friendly state management

## Threats to monitor

### Threat A: Official SDK gets a major upgrade

Mitigation:
- Maintain higher type safety
- Keep extending domain helpers (other SDKs won't replicate compliance logic)
- Stay ahead with latest Zod / Node features

### Threat B: A copycat TS SDK appears

Mitigation:
- Get to 100+ Stars and 200+ DL/week before competition arrives (v1.0 → 3 months)
- Lock in sunabar community Zenn references
- Push for GMO official mention/recognition

### Threat C: GMO releases an official TypeScript SDK

Mitigation:
- We maintain domain helpers (Zengin, residence) that they won't add
- Position as "the SDK for Japanese-business contexts" vs "the official base"
- Possibly contribute back to GMO's effort as a reference impl

## When to invoke this skill

- Before deciding whether to ship a feature
- Before agreeing to a controversial PR
- Before making a versioning decision
- Before writing marketing copy or Zenn articles
```

### 8.2 既存スキルファイルの強化方針

| ファイル | v1.0 案 | v2.0 強化 |
|---|---|---|
| `gmo-aozora-api.md` | API 仕様要約 | + 「公式 SDK との差分」セクション |
| `zengin-format-spec.md` | 全銀協仕様 | + 「他行サンプルとの比較」セクション |
| `ssw-compliance.md` | 派遣業法令 | + 「3トラック構造の判例根拠」セクション |
| `publishing-checklist.md` | リリース手順 | + 「比較表の更新」「Zenn 記事の差分確認」 |

---

## 9. ルール優先度マップ（Cursor がどれを参照するか）

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Always Apply 層（合計 ~2000 トークン以内）                                 │
│                                                                            │
│  AGENTS.md (~600)                                                          │
│  00-mission.mdc (~400) [v2.0 で +50]                                       │
│  01-typescript-style.mdc (~500)                                            │
│  02-security-and-secrets.mdc (~450)                                        │
│  03-differentiation-guard.mdc (~500) ★v2.0 新規最重要                     │
│  04-self-check-protocol.mdc (~550) ★v2.0 新規                             │
│                                                                            │
│  小計: 約 3000 トークン → 02 の重複を整理して 2200-2400 に圧縮             │
└──────────────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ Auto-Attached 層（globs により自動）                                       │
│                                                                            │
│  10-oauth-pkce.mdc            packages/core/src/auth/**                    │
│  11-http-layer.mdc            packages/core/src/http/**                    │
│  12-corporation-api.mdc       packages/core/src/corporation/**             │
│  13-zengin-format.mdc         packages/zengin-format/**                    │
│  14-webhook.mdc               packages/webhook/**                          │
│  20-testing.mdc               **/__tests__/**, **/*.test.ts                │
│  21-error-handling.mdc        **/errors/**                                 │
└──────────────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ Agent Requested 層（description 経由で Cursor 自身が判断）                  │
│                                                                            │
│  30-zod-v4.mdc                Zod スキーマ書く時                           │
│  31-undici-fetch.mdc          HTTP コード書く時                            │
│  32-mcp-apps-ui.mdc           MCP Apps UI 触る時                           │
└──────────────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ Manual 層（@-name で明示呼び出し）                                          │
│                                                                            │
│  @gmo-spec        40-gmo-api-spec.mdc                                      │
│  @zengin-spec     41-zengin-spec.mdc                                       │
│  @compliance      42-compliance.mdc                                        │
│  @anti-patterns   50-anti-patterns-from-official.mdc ★v2.0 新規           │
│  @multi-bank      51-multi-bank-readiness.mdc ★v2.0 新規                  │
│  @pr-ready        52-community-pr-quality.mdc ★v2.0 新規                  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 10. その他の追加提案（ルール以外の強化）

### 10.1 README に「比較表」セクション追加

比較表ドキュメントの内容を README.ja.md / README.md にも掲載：

```markdown
## Why choose this SDK?

| Capability | Official Node SDK | Other JP banks | **This SDK** |
|---|---|---|---|
| TypeScript first | ❌ | ❌ | ✅ |
| Zod validation | ❌ | ❌ | ✅ |
| Auto retry / rate limit | ❌ | ❌ | ✅ |
| Zengin file generation | ❌ | ❌ | ✅ |
| Compile-time shorui validation | ❌ | ❌ | ✅ |
| Webhook verification | manual | ❌ | ✅ |
| Production usage | unknown | unknown | 150+ payroll/month |
```

これがコミュニティ流入の決定打。

### 10.2 ロゴと OG 画像の用意

**SDK のブランドアイデンティティを視覚的に**：

- ロゴ：SVG でシンプルなマーク（「GA」または日本らしい意匠）
- OG 画像：Twitter / GitHub の SocialPreview 用、1200x630
- Zenn / npm のアイコン

**作るタイミング**：v0.6 強化フェーズ（5/19-5/25）。

### 10.3 ベンチマーク（任意、v1.x で）

公式 SDK との性能比較を**実測**して公開：

```
Benchmark: 1000 balance queries
- official gmo-aozora-api-nodejs: 145s
- @sugukuru/gmo-aozora-sdk: 38s (rate-limited, but pipelined)
```

差分は誤差程度かもしれないが、「**測ってる**」という事実が信頼を生みます。

### 10.4 コミュニティ用 Discord / Slack

GitHub Discussions だけでなく、**リアルタイム会話の場**を用意：

- Discord サーバ：`@sugukuru/gmo-aozora-sdk Community`
- チャンネル：`#welcome`, `#help`, `#showcase`, `#multi-bank-discuss`, `#zengin-spec`

GitHub では非同期、Discord では同期、と使い分け。コミュニティ初期は壁さん自身が常駐する必要あり（毎日30分程度）。

### 10.5 「採用候補ロードマップ」を Public

`ROADMAP.md` を公開し、Discussions で意見募集：

```markdown
## Considering for v1.2 (community feedback wanted!)

- [ ] SMBC / MUFG / Mizuho abstraction layer
- [ ] AWS Secrets Manager Token Storage
- [ ] React Query integration
- [ ] Bun runtime support
- [ ] Cloudflare Workers (encoding-japanese fallback)

Vote and comment in [Discussions](link).
```

### 10.6 「貢献者の壁」（Contributors Wall）

README に Contributors のアバター壁を表示：

```markdown
## Contributors

[![Contributors](https://contrib.rocks/image?repo=sugukurukabe/gmo-aozora-sdk)](https://github.com/sugukurukabe/gmo-aozora-sdk/graphs/contributors)
```

PR を出した人が顔を出せる仕組みは強力。

### 10.7 Stars History グラフ

```markdown
## Stars over time

[![Star History Chart](https://api.star-history.com/svg?repos=sugukurukabe/gmo-aozora-sdk&type=Date)](https://star-history.com/#sugukurukabe/gmo-aozora-sdk)
```

成長を可視化することで信頼が積み上がります。

---

## 11. 実装順序（v2.0 反映版）

### 11.1 Day 2 開始前に作るもの（5/5 GW明けに）

```
□ AGENTS.md（v1.0 案に「Differentiation reminder」追加）
□ CLAUDE.md（同期）
□ .cursor/rules/00-mission.mdc（v2.0 拡張版）
□ .cursor/rules/01-typescript-style.mdc（v1.0 そのまま）
□ .cursor/rules/02-security-and-secrets.mdc（v1.0 そのまま）
□ .cursor/rules/03-differentiation-guard.mdc ★v2.0 新規最重要
□ .cursor/rules/04-self-check-protocol.mdc ★v2.0 新規
□ .cursor/rules/10-oauth-pkce.mdc（Day 1 の見直し済を追加）
□ .cursor/rules/11-http-layer.mdc（Day 2 で実装する範囲）
□ packages/zengin-format/AGENTS.md（種別コードの絶対禁止事項を明記）
```

**所要時間**：1.5-2.5時間。Cursor Composer でこの設計書を読ませて自動生成可能。

### 11.2 Day 2-5 実装中に追加

```
□ 12-corporation-api.mdc（Day 2 Phase 2 着手時）
□ 13-zengin-format.mdc（Day 4 着手前、最重要）★multi-bank 強化版
□ 14-webhook.mdc（Day 5 着手前）
□ 20-testing.mdc（テストパターンが固まってから）★Japanese-friendly テスト名強化版
□ 30-zod-v4.mdc / 31-undici-fetch.mdc（同じミスを2回したら）
```

### 11.3 v1.0 公開前に整備（5/26-6/1）

```
□ docs/skills/competitive-positioning.md ★v2.0 新規
□ docs/skills/gmo-aozora-api.md
□ docs/skills/zengin-format-spec.md
□ docs/skills/ssw-compliance.md
□ docs/skills/publishing-checklist.md
□ 50-anti-patterns-from-official.mdc ★v2.0 新規
□ 51-multi-bank-readiness.mdc ★v2.0 新規
□ 52-community-pr-quality.mdc ★v2.0 新規
□ scripts/ 全4ファイル
□ .github/workflows/ 全5ファイル
□ ISSUE_TEMPLATE / PR_TEMPLATE
□ README.md / README.ja.md に比較表セクション追加
□ ROADMAP.md（コミュニティ意見募集形式）
□ Discussions 設定
□ docs/REJECTED.md
```

---

## 12. v1.0 → v2.0 で得られる効果

### 12.1 数値で測れる効果

| 指標 | v1.0 (基本ルール) | v2.0 (差別化ガード追加) |
|---|---|---|
| Cursor が官製SDK風コードを提案する頻度 | 中 | **ほぼ0** |
| `ZenginShorui = string` の混入リスク | 中 | **ゼロ**（型 + ルール 03 + ルール 50 の三重防御） |
| Cursor の `console.log` 提案 | 高 | **ゼロ** |
| 多銀行抽象化（v1.2）の実装難易度 | 高 | **中**（v1.0 段階で予防） |
| PR レビューでの規約違反指摘 | 多 | **少**（Cursor が最初から守る） |
| Cursor が「@gmo-spec 読みます」と自発的に言う頻度 | 低 | **中-高**（自己チェックが習慣化） |

### 12.2 戦略的な効果

```
1. 比較表の差別化を「**コード上で**」死守
   → Zenn 記事や README で言ってる差別化が、コードでも守られる

2. v1.2 多銀行抽象化への道筋を、v1.0 の段階で確保
   → 比較表が示唆する将来ロードマップが実現可能になる

3. PR の質と OSS 運営者目線を、Cursor が初日から理解
   → コミュニティが育ち始めたとき、品質を保てる

4. 「Cursor がプロジェクトの哲学を理解している」状態
   → 将来別の開発者が参加した時、引き継ぎコストが激減
```

---

## 13. 比較表ドキュメントの活用方法（最後の仕上げ）

比較表ドキュメントは**3箇所で再利用**：

### 13.1 README.ja.md / README.md
「Why choose this SDK?」セクションに掲載（§10.1）。

### 13.2 docs/skills/competitive-positioning.md
Cursor が判断に迷ったときに参照する戦略文書（§8.1）。

### 13.3 Zenn 連載第1回
冒頭に比較表 → 「これしかない」を視覚的に伝える。

これにより、**比較表の戦略的価値が、コード・ドキュメント・コミュニティ発信の3層で生きます**。

---

## 14. 次の一歩

3つから選べます：

**A. v2.0 強化版を即実ファイル化（最重要4ルール優先）**
私がこの設計書から、実際の `.mdc` ファイル群を以下の優先順で生成：

1. `AGENTS.md`（ルート、強化版）
2. `00-mission.mdc`（v2.0 拡張版）
3. **`03-differentiation-guard.mdc`**（★最重要）
4. **`04-self-check-protocol.mdc`**（★最重要）
5. `01-typescript-style.mdc` / `02-security-and-secrets.mdc`
6. `13-zengin-format.mdc`（multi-bank 強化版）
7. `packages/zengin-format/AGENTS.md`（パッケージ固有の禁則）

これだけあれば Day 2 開始の前提条件は満たせます。所要1時間。

**B. Day 2 Phase 1 と並行して、ルールも増築**
Cursor が実際にミスした箇所だけルール化する実証主義アプローチ。最小工数。

**C. 全ルール・スキル・ワークフロー一括生成**
本書 §11 の完成形を私が一気に生成（3-4時間）。リポジトリの「完成度」が一気に上がる。

私のおすすめは **A → B → C** の順：

1. **A** で**Differentiation Guard と Self-Check Protocol を最優先**で導入
2. **B** で実装中に追加（Cursor の実挙動を見て judiciously 増築）
3. v1.0 公開前に残りを整備（C の範囲を完了）

これが best practice の「**少なく始めて、必要時に増やす**」を体現しつつ、**比較表が示した戦略的差別化を侵食させない最低限のガード**を初日から効かせる構成です。

A から進めますか？それとも、もう少し議論したい点がありますか？
