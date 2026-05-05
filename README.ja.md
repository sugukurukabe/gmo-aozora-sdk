# @sugukuru/gmo-aozora-sdk

GMOあおぞらネット銀行 Open API 向けの、実運用品質を目指した TypeScript SDK です。

このSDKは単なるAPIラッパーではありません。OAuth PKCE、Zodによる入出力検証、リトライ、レート制限、全銀フォーマット生成、Webhook署名検証までをまとめ、給与振込のような本番運用に耐える作りを目標にしています。

## 特徴

| 項目 | 公式Node SDK | このSDK |
|---|---|---|
| TypeScript | JavaScript中心 | TypeScript 5.x strict |
| 入出力検証 | なし | Zod v4 |
| リトライ / レート制限 | なし | 標準搭載 |
| OAuth PKCE | 手動実装寄り | S256のみ |
| 振込結果ポーリング | 手動 | `pollResult()` |
| 全銀フォーマット | なし | `@sugukuru/zengin-format` |
| Webhook署名検証 | 手動 | `@sugukuru/gmo-aozora-webhook` |

## インストール

```bash
npm install @sugukuru/gmo-aozora-sdk
```

関連パッケージ:

```bash
npm install @sugukuru/zengin-format
npm install @sugukuru/gmo-aozora-webhook
```

## クイックスタート

### パターン A: すでにアクセストークンを持っている（スクリプト・検証用）

Sunabar のポータルや `pnpm sunabar:auth` で取得したトークンをそのまま使えます。

```typescript
import {
  GmoAozoraClient,
  InMemoryTokenStorage,
  parseAmount,
} from '@sugukuru/gmo-aozora-sdk';

// 1. トークンをストレージにセット
const storage = new InMemoryTokenStorage();
await storage.save('me', {
  accessToken: process.env.GMO_ACCESS_TOKEN!,
  refreshToken: '',                          // リフレッシュ不要なら空文字
  expiresAt: Date.now() + 3_600_000,        // 1時間後
  tokenType: 'Bearer',
  scope: 'private:account',
});

// 2. クライアント初期化
const client = new GmoAozoraClient({
  environment: 'sunabar',                   // 'sunabar' | 'staging' | 'production'
  clientId: process.env.GMO_CLIENT_ID!,
  clientSecret: process.env.GMO_CLIENT_SECRET!,
  redirectUri: 'http://localhost:8080/callback',
  tokenStorage: storage,
}).useUser('me');                            // 'me' は任意の識別子

// 3. API 呼び出し
const balance = await client.corporation.balances.get(
  process.env.GMO_ACCOUNT_ID!,             // 口座番号（数字のみ）
);
console.log(`残高: ¥${parseAmount(balance?.bookBalance ?? '0').toLocaleString()}`);
```

> **`useUser(userId)` とは?**
> トークンを区別するための任意の文字列キーです。
> スクリプトなら `'me'`、Webアプリなら DB のユーザー ID を渡します。

実行方法:

```bash
GMO_ACCESS_TOKEN=xxx GMO_ACCOUNT_ID=yyy pnpm exec tsx examples/balance-check.ts
```

---

### パターン B: OAuth 2.0 PKCE でログインフローを実装する（Web アプリ向け）

```typescript
import { GmoAozoraClient, PRIVATE_SCOPES } from '@sugukuru/gmo-aozora-sdk';

const app = new GmoAozoraClient({
  environment: 'sunabar',
  clientId: process.env.GMO_CLIENT_ID!,
  clientSecret: process.env.GMO_CLIENT_SECRET!,
  redirectUri: 'https://app.example.com/callback',
  defaultScopes: [PRIVATE_SCOPES.ACCOUNT, PRIVATE_SCOPES.OFFLINE_ACCESS],
});

// ① ログイン開始: 認可URLを生成してリダイレクト
const { url, session } = app.buildAuthorizationUrl();
// `session` を HTTPセッションやDBに一時保存
// ユーザーを `url` にリダイレクト

// ② コールバック受信 (/callback?code=...&state=...)
const user = app.useUser('user-123');             // DBのユーザーIDなど
await user.exchangeCode({
  code: req.query.code,
  state: req.query.state,
  session,                                        // ①で保存した session
});

// ③ 以降は通常通り使う（トークンは自動リフレッシュ）
const balance = await user.corporation.balances.get('123456789012');
```

完全な実装例 → [`examples/oauth-callback-server.ts`](examples/oauth-callback-server.ts)

## 代表的な利用例

### 入出金明細を自動ページングで取得

```typescript
for await (const tx of user.corporation.transactions.iterate({
  accountId: '123456789012',
  dateFrom: '2026-05-01',
  dateTo: '2026-05-31',
})) {
  console.log(tx.transactionDate, tx.amount);
}
```

### 総合振込の依頼と結果待ち

```typescript
const request = await user.corporation.bulkTransfers.create({
  accountId: '123456789012',
  transferDesignatedDate: '2026-05-25',
  totalCount: '1',
  totalAmount: '250000',
  bulkTransfers: [
    {
      itemId: '1',
      transferAmount: '250000',
      beneficiaryBankCode: '0310',
      beneficiaryBranchCode: '001',
      accountTypeCode: '1',
      accountNumber: '1234567',
      beneficiaryName: 'TANAKA TARO',
    },
  ],
});

const result = await user.corporation.bulkTransfers.pollResult(
  { accountId: '123456789012', applyNo: request.applyNo },
  { intervalMs: 60_000, timeoutMs: 7_200_000 },
);
```

### Webhook署名検証

```typescript
import express from 'express';
import { webhookMiddleware } from '@sugukuru/gmo-aozora-webhook';

const app = express();

app.use('/webhook', express.raw({ type: 'application/json' }));
app.use('/webhook', webhookMiddleware({ secret: process.env.WEBHOOK_SECRET! }));

app.post('/webhook', (req, res) => {
  console.log(req.webhookEvent?.eventType);
  res.json({ ok: true });
});
```

## セキュリティ上の注意

- 本番ではアクセストークンを平文保存しないでください。`TokenStorage` をKMS/Vault等で実装します。
- Webhookは必ず raw `Buffer` を署名検証してください。JSON parse 後のbodyでは検証できません。
- 金額はAPI上では文字列です。計算時は `parseAmount()` で `bigint` に変換してください。

## ドキュメント

- [Architecture](docs/architecture.md)
- [Security](docs/security.md)
- [Sunabar 実証ガイド](docs/sunabar-guide.md)
- [Official SDK crosswalk](docs/spec-audit/official-sdk-crosswalk.md)
- [Examples](examples/)

## ライセンス

Apache-2.0 © Sugukuru Co., Ltd.
