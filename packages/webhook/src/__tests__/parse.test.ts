import { describe, it, expect } from 'vitest';
import { parseWebhookEvent } from '../parse.js';
import { WebhookPayloadError } from '../errors.js';

const VALID_EVENT = {
  notificationId: 'notif-001',
  eventType: 'va-deposit-transaction',
  eventTime: '2026-05-25T12:00:00+09:00',
  data: {
    virtualAccountId: 'va-123',
    transactionId: 'txn-456',
    amount: '5800',
    senderName: 'ｽｸﾞｸﾙ ｶﾌﾞｼｷｶﾞｲｼｬ',
  },
};

describe('parseWebhookEvent', () => {
  it('parses a valid va-deposit-transaction event', () => {
    const buf = Buffer.from(JSON.stringify(VALID_EVENT));
    const event = parseWebhookEvent(buf);
    expect(event.eventType).toBe('va-deposit-transaction');
    expect(event.notificationId).toBe('notif-001');
    expect(event.data.amount).toBe('5800');
    expect(event.data.virtualAccountId).toBe('va-123');
  });

  it('throws WebhookPayloadError for invalid JSON', () => {
    const buf = Buffer.from('not-json');
    expect(() => parseWebhookEvent(buf)).toThrow(WebhookPayloadError);
    expect(() => parseWebhookEvent(buf)).toThrow('JSON');
  });

  it('throws WebhookPayloadError for unknown eventType', () => {
    const bad = { ...VALID_EVENT, eventType: 'unknown-event' };
    const buf = Buffer.from(JSON.stringify(bad));
    expect(() => parseWebhookEvent(buf)).toThrow(WebhookPayloadError);
  });

  it('throws WebhookPayloadError for missing required fields', () => {
    const bad = { eventType: 'va-deposit-transaction' }; // missing data
    const buf = Buffer.from(JSON.stringify(bad));
    expect(() => parseWebhookEvent(buf)).toThrow(WebhookPayloadError);
  });

  it('passes extra fields through (passthrough schema)', () => {
    const withExtra = { ...VALID_EVENT, data: { ...VALID_EVENT.data, extraField: 'x' } };
    const buf = Buffer.from(JSON.stringify(withExtra));
    const event = parseWebhookEvent(buf);
    expect((event.data as Record<string, unknown>)['extraField']).toBe('x');
  });
});
