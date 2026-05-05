import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyWebhookSignature } from './verify.js';
import { parseWebhookEvent } from './parse.js';
import { WebhookPayloadError } from './errors.js';
import type { WebhookEvent } from './schemas.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      webhookEvent?: WebhookEvent;
    }
  }
}

export type WebhookMiddlewareOptions = {
  /** The HMAC-SHA256 shared secret */
  secret: string;
  /**
   * The header name carrying the signature.
   * Parameterized per rule 03 (no hardcoded GMO-specific header names).
   * @default 'x-webhook-signature'
   */
  headerName?: string;
};

/**
 * Express middleware for webhook signature verification and event parsing.
 *
 * IMPORTANT: This middleware requires the raw request body to be available as
 * `req.body` as a Buffer. Use `express.raw({ type: 'application/json' })` before
 * this middleware in your middleware stack.
 *
 * Example:
 * ```ts
 * app.use('/webhook', express.raw({ type: 'application/json' }));
 * app.use('/webhook', webhookMiddleware({ secret: process.env.WEBHOOK_SECRET! }));
 * ```
 *
 * On success, attaches the parsed event to `req.webhookEvent`.
 * On failure, responds with 400 (missing header / missing raw body) or 401 (invalid signature).
 */
export function webhookMiddleware(options: WebhookMiddlewareOptions): RequestHandler {
  const { secret, headerName = 'x-webhook-signature' } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const signature = req.headers[headerName];
    if (!signature || typeof signature !== 'string') {
      res.status(400).json({
        error: `Missing required header: ${headerName}`,
      });
      return;
    }

    if (!Buffer.isBuffer(req.body)) {
      res.status(400).json({
        error:
          'Webhook raw body must be a Buffer. Configure express.raw({ type: "application/json" }) before webhookMiddleware.',
      });
      return;
    }

    const rawBody = req.body;

    const isValid = verifyWebhookSignature({ rawBody, signature, secret });
    if (!isValid) {
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }

    try {
      req.webhookEvent = parseWebhookEvent(rawBody);
    } catch (e) {
      if (e instanceof WebhookPayloadError) {
        res.status(400).json({ error: e.message });
        return;
      }
      next(e);
      return;
    }

    next();
  };
}
