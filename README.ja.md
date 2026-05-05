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

```typescript
import { GmoAozoraClient, PRIVATE_SCOPES, parseAmount } from '@sugukuru/gmo-aozora-sdk';

const client = new GmoAozoraClient({
  environment: 'sunabar',
  clientId: process.env.GMO_CLIENT_ID!,
  clientSecret: process.env.GMO_CLIENT_SECRET!,
  redirectUri: 'https://app.example.com/callback',
  defaultScopes: [PRIVATE_SCOPES.ACCOUNT, PRIVATE_SCOPES.OFFLINE_ACCESS],
});

const user = client.useUser('user-123');

const balance = await user.corporation.balances.get('123456789012');
console.log(parseAmount(balance?.bookBalance ?? '0'));
```

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
- [Sunabar validation guide](docs/sunabar-validation.md)
- [Official SDK crosswalk](docs/spec-audit/official-sdk-crosswalk.md)
- [Examples](examples/)

## ライセンス

Apache-2.0 © Sugukuru Co., Ltd.
