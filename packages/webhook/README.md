# @sugukuru/gmo-aozora-webhook

Webhook HMAC-SHA256 verification for GMO Aozora Net Bank.

Framework-agnostic — works with Express, Hono, Fastify, or any Node.js framework.

## Install

```bash
npm install @sugukuru/gmo-aozora-webhook
# For Express middleware:
npm install express
```

## Quick Start (Express)

```typescript
import express from 'express';
import { webhookMiddleware } from '@sugukuru/gmo-aozora-webhook';

const app = express();

// IMPORTANT: express.raw() MUST come before webhookMiddleware
// so that req.body is a Buffer (not parsed JSON)
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use('/webhook', webhookMiddleware({ secret: process.env.WEBHOOK_SECRET! }));

app.post('/webhook', (req, res) => {
  const event = req.webhookEvent!;
  console.log('Received:', event.eventType, event.data.amount);
  res.json({ received: true });
});
```

## Framework-Agnostic Verification

```typescript
import { verifyAndParseWebhookEvent } from '@sugukuru/gmo-aozora-webhook';

// Raw handler (any framework)
async function handleWebhook(rawBody: Buffer, signatureHeader: string) {
  const event = verifyAndParseWebhookEvent({
    rawBody,
    signature: signatureHeader,    // base64-encoded HMAC-SHA256
    secret: process.env.WEBHOOK_SECRET!,
  });

  // event.eventType === 'va-deposit-transaction'
  // event.data.virtualAccountId, event.data.amount, event.data.senderName
}
```

## Webhook Event Shape

```json
{
  "notificationId": "string",
  "eventType": "va-deposit-transaction",
  "eventTime": "2026-06-01T12:00:00+09:00",
  "data": {
    "virtualAccountId": "string",
    "amount": "5800",
    "senderName": "ｽｸﾞｸﾙ ｶﾌﾞｼｷｶﾞｲｼｬ",
    "transactionId": "string"
  }
}
```

Signature header: `x-webhook-signature` (base64-encoded HMAC-SHA256)

## Security

- Uses `crypto.timingSafeEqual` — constant-time comparison, immune to timing attacks
- Reads raw body **before** JSON parsing — signature covers the exact bytes received
- All schemas use `.passthrough()` — unknown GMO fields don't break parsing

## TypeScript

```typescript
import type { WebhookEvent, VaDepositTransaction } from '@sugukuru/gmo-aozora-webhook';

app.post('/webhook', (req, res) => {
  const event: WebhookEvent = req.webhookEvent!;
  const data: VaDepositTransaction = event.data;
});
```

## License

Apache-2.0 — Sugukuru Co., Ltd.
