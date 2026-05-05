import { describe, it, expect } from 'vitest';
import {
  WebhookEventSchema,
  WebhookEventNameSchema,
  VaDepositTransactionSchema,
} from '../schemas.js';

const VALID_DATA = {
  virtualAccountId: 'va-123',
  transactionId: 'txn-456',
  amount: '5800',
  senderName: 'ｽｸﾞｸﾙ ｶﾌﾞｼｷｶﾞｲｼｬ',
};

const VALID_EVENT = {
  notificationId: 'notif-001',
  eventType: 'va-deposit-transaction',
  eventTime: '2026-05-25T12:00:00+09:00',
  data: VALID_DATA,
};

describe('WebhookEventNameSchema', () => {
  it('accepts "va-deposit-transaction"', () => {
    expect(WebhookEventNameSchema.safeParse('va-deposit-transaction').success).toBe(true);
  });

  it('rejects unknown event types', () => {
    expect(WebhookEventNameSchema.safeParse('some-other-event').success).toBe(false);
    expect(WebhookEventNameSchema.safeParse('').success).toBe(false);
  });
});

describe('VaDepositTransactionSchema', () => {
  it('accepts a valid data payload', () => {
    const result = VaDepositTransactionSchema.safeParse(VALID_DATA);
    expect(result.success).toBe(true);
  });

  it('accepts payload without optional senderName', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { senderName: _senderName, ...noSender } = VALID_DATA;
    const result = VaDepositTransactionSchema.safeParse(noSender);
    expect(result.success).toBe(true);
  });

  it('passes through unknown fields', () => {
    const result = VaDepositTransactionSchema.safeParse({ ...VALID_DATA, extra: 'field' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>)['extra']).toBe('field');
    }
  });
});

describe('WebhookEventSchema', () => {
  it('accepts a valid event fixture', () => {
    const result = WebhookEventSchema.safeParse(VALID_EVENT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.eventType).toBe('va-deposit-transaction');
      expect(result.data.notificationId).toBe('notif-001');
      expect(result.data.data.amount).toBe('5800');
    }
  });

  it('rejects events with unknown eventType', () => {
    const result = WebhookEventSchema.safeParse({ ...VALID_EVENT, eventType: 'future-event' });
    expect(result.success).toBe(false);
  });

  it('rejects events missing data', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data: _data, ...noData } = VALID_EVENT;
    const result = WebhookEventSchema.safeParse(noData);
    expect(result.success).toBe(false);
  });

  it('passes through additional top-level fields (passthrough schema)', () => {
    const result = WebhookEventSchema.safeParse({ ...VALID_EVENT, futureField: 'value' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>)['futureField']).toBe('value');
    }
  });
});
