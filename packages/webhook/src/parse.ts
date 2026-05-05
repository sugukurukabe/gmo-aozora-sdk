import { WebhookEventSchema } from './schemas.js';
import { WebhookPayloadError } from './errors.js';
import type { WebhookEvent } from './schemas.js';

/**
 * Parse a raw webhook request body into a typed WebhookEvent.
 *
 * @param rawBody The raw request body as a Buffer (verified BEFORE parsing)
 * @returns Parsed and Zod-validated webhook event
 * @throws {WebhookPayloadError} if JSON parsing fails or schema validation fails
 */
export function parseWebhookEvent(rawBody: Buffer): WebhookEvent {
  let json: unknown;
  try {
    json = JSON.parse(rawBody.toString('utf8'));
  } catch (e) {
    throw new WebhookPayloadError('Failed to parse webhook body as JSON', e);
  }

  const result = WebhookEventSchema.safeParse(json);
  if (!result.success) {
    throw new WebhookPayloadError(
      `Webhook payload validation failed: ${result.error.message}`,
      result.error,
    );
  }

  return result.data;
}
