import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyAndParseWebhookEvent } from '../verifier.js';
import { WebhookPayloadError, WebhookSignatureError } from '../errors.js';

const SECRET = 'verifier-test-secret';

function sign(rawBody: Buffer): string {
  return createHmac('sha256', SECRET).update(rawBody).digest('base64');
}

const VALID_EVENT = {
  notificationId: 'notif-001',
  eventType: 'va-deposit-transaction',
  eventTime: '2026-05-25T12:00:00+09:00',
  data: {
    virtualAccountId: 'va-001',
    transactionId: 'txn-001',
    amount: '5800',
  },
};

describe('verifyAndParseWebhookEvent', () => {
  it('returns parsed event when signature is valid', () => {
    const rawBody = Buffer.from(JSON.stringify(VALID_EVENT));
    const event = verifyAndParseWebhookEvent({
      rawBody,
      signature: sign(rawBody),
      secret: SECRET,
    });

    expect(event.eventType).toBe('va-deposit-transaction');
    expect(event.data.amount).toBe('5800');
  });

  it('throws WebhookSignatureError when signature is invalid', () => {
    const rawBody = Buffer.from(JSON.stringify(VALID_EVENT));

    expect(() =>
      verifyAndParseWebhookEvent({
        rawBody,
        signature: sign(Buffer.from('different-body')),
        secret: SECRET,
      }),
    ).toThrow(WebhookSignatureError);
  });

  it('throws WebhookPayloadError when verified body is not a valid event', () => {
    const rawBody = Buffer.from(JSON.stringify({ eventType: 'va-deposit-transaction' }));

    expect(() =>
      verifyAndParseWebhookEvent({
        rawBody,
        signature: sign(rawBody),
        secret: SECRET,
      }),
    ).toThrow(WebhookPayloadError);
  });
});
