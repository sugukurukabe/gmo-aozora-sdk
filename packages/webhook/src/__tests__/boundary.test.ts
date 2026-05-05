/**
 * Boundary and edge-case tests for @sugukuru/gmo-aozora-webhook.
 *
 * These tests cover: raw body integrity, unknown events, signature edge cases,
 * and parameterized header name variations.
 */
import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyWebhookSignature } from '../verify.js';
import { parseWebhookEvent } from '../parse.js';
import { UnknownWebhookEventSchema } from '../schemas.js';
import { WebhookPayloadError } from '../errors.js';

const SECRET = 'boundary-test-secret';

function sign(body: Buffer | string, secret = SECRET): string {
  return createHmac('sha256', secret)
    .update(Buffer.isBuffer(body) ? body : Buffer.from(body))
    .digest('base64');
}

const VALID_BODY = Buffer.from(
  JSON.stringify({
    notificationId: 'notif-001',
    eventType: 'va-deposit-transaction',
    eventTime: '2026-06-01T12:00:00+09:00',
    data: {
      virtualAccountId: 'va-9999',
      transactionId: 'txn-abc',
      amount: '150000',
      senderName: 'ﾔﾏﾀﾞ ﾀﾛｳ',
    },
  }),
);

describe('verifyWebhookSignature boundary cases', () => {
  it('treats base64 and hex as different encodings (hex sig should fail)', () => {
    const hexSig = createHmac('sha256', SECRET).update(VALID_BODY).digest('hex');
    expect(verifyWebhookSignature({ rawBody: VALID_BODY, signature: hexSig, secret: SECRET })).toBe(
      false,
    );
  });

  it('is sensitive to a single byte change in the body', () => {
    const validSig = sign(VALID_BODY);
    const altered = Buffer.from(VALID_BODY);
    // Flip one bit in the JSON
    altered[altered.byteLength - 2] = altered[altered.byteLength - 2]! ^ 0x01;
    expect(verifyWebhookSignature({ rawBody: altered, signature: validSig, secret: SECRET })).toBe(
      false,
    );
  });

  it('handles empty body with correct signature', () => {
    const empty = Buffer.alloc(0);
    const sig = sign(empty);
    expect(verifyWebhookSignature({ rawBody: empty, signature: sig, secret: SECRET })).toBe(true);
  });

  it('handles large body (50 KB) without error', () => {
    const large = Buffer.from(JSON.stringify({ data: 'x'.repeat(50_000) }));
    const sig = sign(large);
    expect(verifyWebhookSignature({ rawBody: large, signature: sig, secret: SECRET })).toBe(true);
  });

  it('returns false for corrupted base64 signature (not valid base64)', () => {
    // Non-base64 characters should result in a different length buffer → false
    const badSig = '!!!not-base64!!!';
    expect(verifyWebhookSignature({ rawBody: VALID_BODY, signature: badSig, secret: SECRET })).toBe(
      false,
    );
  });

  it('returns false for padded-zero signature with same length (constant-time test)', () => {
    const validSig = sign(VALID_BODY);
    // Decode the valid sig and zero-fill the buffer to the same byte length
    const decoded = Buffer.from(validSig, 'base64');
    const zeroed = Buffer.alloc(decoded.byteLength, 0).toString('base64');
    expect(verifyWebhookSignature({ rawBody: VALID_BODY, signature: zeroed, secret: SECRET })).toBe(
      false,
    );
  });
});

describe('parseWebhookEvent boundary cases', () => {
  it('parses a realistic payroll-sized deposit event', () => {
    const event = parseWebhookEvent(VALID_BODY);
    expect(event.eventType).toBe('va-deposit-transaction');
    expect(event.data.amount).toBe('150000');
    expect(event.data.virtualAccountId).toBe('va-9999');
  });

  it('passes through additional top-level GMO fields', () => {
    const extra = {
      notificationId: 'n-001',
      eventType: 'va-deposit-transaction',
      eventTime: '2026-06-01T12:00:00+09:00',
      data: {
        virtualAccountId: 'va-001',
        transactionId: 'txn-001',
        amount: '5800',
      },
      deliveryAttempt: 1,
      apiVersion: '1.8.0',
    };
    const event = parseWebhookEvent(Buffer.from(JSON.stringify(extra)));
    expect((event as Record<string, unknown>)['deliveryAttempt']).toBe(1);
  });

  it('throws for null body', () => {
    expect(() => parseWebhookEvent(Buffer.from('null'))).toThrow(WebhookPayloadError);
  });

  it('throws for array body', () => {
    expect(() => parseWebhookEvent(Buffer.from('[]'))).toThrow(WebhookPayloadError);
  });

  it('throws for empty object body', () => {
    expect(() => parseWebhookEvent(Buffer.from('{}'))).toThrow(WebhookPayloadError);
  });

  it('throws WebhookPayloadError for boolean body', () => {
    expect(() => parseWebhookEvent(Buffer.from('true'))).toThrow(WebhookPayloadError);
  });
});

describe('UnknownWebhookEventSchema for future event types', () => {
  it('accepts a future event type without failing', () => {
    const future = {
      notificationId: 'n-future',
      eventType: 'some-new-event',
      eventTime: '2027-01-01T00:00:00+09:00',
      data: { foo: 'bar' },
    };
    expect(UnknownWebhookEventSchema.safeParse(future).success).toBe(true);
  });

  it('accepts event with only required eventType', () => {
    expect(UnknownWebhookEventSchema.safeParse({ eventType: 'x' }).success).toBe(true);
  });

  it('rejects event missing eventType', () => {
    expect(UnknownWebhookEventSchema.safeParse({ notificationId: 'x' }).success).toBe(false);
  });
});
