import { describe, it, expect, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { webhookMiddleware } from '../express.js';
import type { Request, Response, NextFunction } from 'express';

const SECRET = 'express-test-secret';

const VALID_BODY = Buffer.from(
  JSON.stringify({
    notificationId: 'notif-001',
    eventType: 'va-deposit-transaction',
    eventTime: '2026-05-25T12:00:00+09:00',
    data: {
      virtualAccountId: 'va-123',
      transactionId: 'txn-456',
      amount: '5800',
      senderName: 'ｽｸﾞｸﾙ ｶﾌﾞｼｷｶﾞｲｼｬ',
    },
  }),
);

function makeSignature(body: Buffer): string {
  return createHmac('sha256', SECRET).update(body).digest('base64');
}

function makeReq(body: Buffer, headers: Record<string, string> = {}): Request {
  return {
    body,
    headers: { 'x-webhook-signature': makeSignature(body), ...headers },
  } as unknown as Request;
}

function makeRes(): {
  res: Response;
  json: ReturnType<typeof vi.fn>;
  status: ReturnType<typeof vi.fn>;
} {
  const json = vi.fn().mockReturnThis();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { status, json } as unknown as Response, json, status };
}

describe('webhookMiddleware', () => {
  const middleware = webhookMiddleware({ secret: SECRET });

  it('calls next() for a valid request and attaches webhookEvent', () => {
    const req = makeReq(VALID_BODY);
    const { res } = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.webhookEvent?.eventType).toBe('va-deposit-transaction');
  });

  it('responds 401 for a tampered body', () => {
    const tamperedBody = Buffer.from('{"tampered":true}');
    const req = {
      body: tamperedBody,
      headers: { 'x-webhook-signature': makeSignature(VALID_BODY) }, // sig for original body
    } as unknown as Request;
    const { res, status, json } = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'Invalid webhook signature' });
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 400 when signature header is missing', () => {
    const req = {
      body: VALID_BODY,
      headers: {},
    } as unknown as Request;
    const { res, status } = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(status).toHaveBeenCalledWith(400);
  });

  it('responds 400 when req.body is not a raw Buffer', () => {
    const req = {
      body: JSON.parse(VALID_BODY.toString('utf8')) as unknown,
      headers: { 'x-webhook-signature': makeSignature(VALID_BODY) },
    } as unknown as Request;
    const { res, status, json } = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error:
        'Webhook raw body must be a Buffer. Configure express.raw({ type: "application/json" }) before webhookMiddleware.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('uses custom headerName when provided', () => {
    const customMiddleware = webhookMiddleware({ secret: SECRET, headerName: 'x-custom-sig' });
    const sig = makeSignature(VALID_BODY);
    const req = {
      body: VALID_BODY,
      headers: { 'x-custom-sig': sig },
    } as unknown as Request;
    const { res } = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    customMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
