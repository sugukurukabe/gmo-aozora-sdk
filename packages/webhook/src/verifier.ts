import { WebhookSignatureError } from './errors.js';
import { parseWebhookEvent } from './parse.js';
import { verifyWebhookSignature } from './verify.js';
import type { WebhookEvent } from './schemas.js';

export type VerifyAndParseWebhookEventParams = {
  /** Raw request body as received from the bank, before JSON parsing. */
  rawBody: Buffer;
  /** Base64-encoded HMAC-SHA256 signature header value. */
  signature: string;
  /** Shared HMAC secret configured with the webhook provider. */
  secret: string;
};

/**
 * Verify the webhook signature and parse the event body in one framework-agnostic call.
 *
 * Use this helper from Hono, Fastify, Cloudflare Workers adapters, queues, or
 * any environment where you can provide the raw request body as a `Buffer`.
 *
 * @throws {WebhookSignatureError} when the signature does not match.
 * @throws {WebhookPayloadError} when the JSON body does not match the schema.
 */
export function verifyAndParseWebhookEvent({
  rawBody,
  signature,
  secret,
}: VerifyAndParseWebhookEventParams): WebhookEvent {
  const isValid = verifyWebhookSignature({ rawBody, signature, secret });
  if (!isValid) {
    throw new WebhookSignatureError();
  }

  return parseWebhookEvent(rawBody);
}
