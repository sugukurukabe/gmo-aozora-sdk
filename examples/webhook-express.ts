/**
 * webhook-express.ts — Express server with GMO Aozora webhook verification.
 *
 * Receives va-deposit-transaction events and logs the deposit details.
 *
 * Dependencies (install in your project):
 *   npm install express
 *   npm install -D @types/express
 *
 * Environment variables required:
 *   WEBHOOK_SECRET   — The shared HMAC-SHA256 secret from the GMO Aozora console
 *   PORT             — Optional, defaults to 3000
 *
 * Run: npx tsx examples/webhook-express.ts
 *
 * Test with curl (GMO sends base64-encoded HMAC-SHA256):
 *   BODY='{"notificationId":"001","eventType":"va-deposit-transaction","eventTime":"2026-05-05T12:00:00+09:00","data":{"virtualAccountId":"va-123","transactionId":"txn-1","amount":"5800","senderName":"ｽｸﾞｸﾙ ｶﾌﾞｼｷｶﾞｲｼｬ"}}'
 *   SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -binary | base64)
 *   curl -X POST http://localhost:3000/webhook \
 *     -H "Content-Type: application/json" \
 *     -H "x-webhook-signature: $SIG" \
 *     -d "$BODY"
 */
import express, { type Request, type Response } from 'express';
import { webhookMiddleware } from '@sugukuru/gmo-aozora-webhook';

const secret = process.env['WEBHOOK_SECRET'];
if (!secret) {
  console.error('Set WEBHOOK_SECRET environment variable.');
  process.exit(1);
}

const app = express();
const port = parseInt(process.env['PORT'] ?? '3000', 10);

// IMPORTANT: express.raw() must come BEFORE the webhook middleware
// so that req.body is a Buffer (not parsed JSON).
app.use('/webhook', express.raw({ type: 'application/json' }), webhookMiddleware({ secret }));

app.post('/webhook', (req: Request, res: Response) => {
  const event = req.webhookEvent;
  if (!event) {
    res.status(500).json({ error: 'webhookEvent not attached' });
    return;
  }

  console.log('[Webhook] Event received:', {
    notificationId: event.notificationId,
    eventType: event.eventType,
    eventTime: event.eventTime,
    virtualAccountId: event.data.virtualAccountId,
    transactionId: event.data.transactionId,
    senderName: event.data.senderName,
    amount: `¥${parseInt(event.data.amount, 10).toLocaleString()}`,
  });

  res.status(200).json({ received: true });
});

app.listen(port, () => {
  console.log(`Webhook server listening on http://localhost:${port}/webhook`);
});
