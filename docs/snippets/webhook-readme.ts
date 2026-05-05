import express, { type Request, type Response } from 'express';
import {
  webhookMiddleware,
  verifyAndParseWebhookEvent,
  type VaDepositTransaction,
  type WebhookEvent,
} from '@sugukuru/gmo-aozora-webhook';

const app = express();
const secret = process.env['WEBHOOK_SECRET'] ?? 'development-secret';

app.use('/webhook', express.raw({ type: 'application/json' }));
app.use('/webhook', webhookMiddleware({ secret }));

app.post('/webhook', (req: Request, res: Response) => {
  const event: WebhookEvent | undefined = req.webhookEvent;
  if (!event) {
    res.status(500).json({ error: 'webhookEvent not attached' });
    return;
  }

  const data: VaDepositTransaction = event.data;
  console.log('Received:', event.eventType, data.amount);
  res.json({ received: true });
});

async function handleWebhook(rawBody: Buffer, signatureHeader: string): Promise<WebhookEvent> {
  return verifyAndParseWebhookEvent({
    rawBody,
    signature: signatureHeader,
    secret,
  });
}

await handleWebhook(Buffer.from('{}'), 'invalid-signature').catch(() => undefined);
