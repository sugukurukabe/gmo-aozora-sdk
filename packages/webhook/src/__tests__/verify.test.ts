import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyWebhookSignature } from '../verify.js';

function makeSignature(body: Buffer, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64');
}

describe('verifyWebhookSignature', () => {
  const secret = 'test-secret-key';
  const body = Buffer.from(JSON.stringify({ eventType: 'va-deposit-transaction' }));
  const validSig = makeSignature(body, secret);

  it('returns true for a valid base64 signature', () => {
    expect(verifyWebhookSignature({ rawBody: body, signature: validSig, secret })).toBe(true);
  });

  it('returns false for a tampered body', () => {
    const tamperedBody = Buffer.from('{"eventType":"tampered"}');
    expect(verifyWebhookSignature({ rawBody: tamperedBody, signature: validSig, secret })).toBe(
      false,
    );
  });

  it('returns false for a wrong secret', () => {
    expect(
      verifyWebhookSignature({ rawBody: body, signature: validSig, secret: 'wrong-secret' }),
    ).toBe(false);
  });

  it('returns false for a truncated signature (length mismatch)', () => {
    const shortSig = validSig.slice(0, 10);
    expect(verifyWebhookSignature({ rawBody: body, signature: shortSig, secret })).toBe(false);
  });

  it('returns false for empty signature', () => {
    expect(verifyWebhookSignature({ rawBody: body, signature: '', secret })).toBe(false);
  });

  it('is consistent across multiple calls with the same valid input', () => {
    // Verifies deterministic HMAC behavior; the implementation uses timingSafeEqual
    // internally (non-mockable native function), so we verify via behavioral consistency.
    for (let i = 0; i < 5; i++) {
      expect(verifyWebhookSignature({ rawBody: body, signature: validSig, secret })).toBe(true);
    }
  });
});
