/**
 * Base class for all webhook errors.
 *
 * Intentionally independent of @sugukuru/gmo-aozora-sdk per rule 03
 * (Forbidden Pattern 5 — GMO-only assumptions in shared packages).
 */
export class WebhookError extends Error {
  override readonly name: string = 'WebhookError';
}

/** Thrown when the HMAC-SHA256 signature does not match the request body. */
export class WebhookSignatureError extends WebhookError {
  override readonly name = 'WebhookSignatureError' as const;
  constructor(message = 'Webhook signature verification failed') {
    super(message);
  }
}

/** Thrown when the raw body cannot be parsed as a valid webhook event. */
export class WebhookPayloadError extends WebhookError {
  override readonly name = 'WebhookPayloadError' as const;
  readonly parseError: unknown;
  constructor(message: string, parseError?: unknown) {
    super(message);
    if (parseError !== undefined) {
      this.parseError = parseError;
    }
  }
}
