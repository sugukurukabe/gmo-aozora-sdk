import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verify a webhook HMAC-SHA256 signature using timing-safe comparison.
 *
 * CRITICAL: This function MUST use timingSafeEqual — never === or == — to
 * prevent timing attacks per security rule 02-security-and-secrets.mdc.
 *
 * GMO Aozora sends the signature as a base64-encoded HMAC-SHA256 digest in
 * the configured request header (default: `x-webhook-signature`).
 *
 * @param rawBody   The raw request body as a Buffer (read BEFORE JSON parsing)
 * @param signature The base64-encoded signature from the request header
 * @param secret    The shared HMAC secret
 * @returns true if the signature is valid, false otherwise (never throws)
 */
export function verifyWebhookSignature({
  rawBody,
  signature,
  secret,
}: {
  rawBody: Buffer;
  signature: string;
  secret: string;
}): boolean {
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, 'base64');
  } catch {
    return false;
  }

  // Length mismatch would cause timingSafeEqual to throw; return false instead
  if (expected.byteLength !== actual.byteLength) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}
