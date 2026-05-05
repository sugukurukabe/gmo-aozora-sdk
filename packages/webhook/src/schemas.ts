import { z } from 'zod';

/**
 * Event type names that this SDK version explicitly handles.
 * Using a literal type ensures new event types are typed additions, not string widening.
 */
export const WebhookEventNameSchema = z.literal('va-deposit-transaction');
export type WebhookEventName = z.infer<typeof WebhookEventNameSchema>;

/**
 * VA (Virtual Account) deposit transaction data payload.
 *
 * Field names align with the GMO Aozora webhook spec (nested inside `data`).
 * Unknown fields are passed through for forward compatibility.
 *
 * NOTE(spec-confirm): Validate against real Sunabar webhook before v1.0 publish.
 */
export const VaDepositTransactionSchema = z
  .object({
    /** The virtual account ID that received the deposit. */
    virtualAccountId: z.string(),
    /** Deposit amount as numeric string. Use parseAmount() for bigint arithmetic. */
    amount: z.string(),
    /** Sender name in half-width katakana. */
    senderName: z.string().optional(),
    /** Bank-assigned transaction identifier. */
    transactionId: z.string(),
  })
  .passthrough();

export type VaDepositTransaction = z.infer<typeof VaDepositTransactionSchema>;

/**
 * Generic webhook event envelope.
 *
 * GMO Aozora webhook payload structure:
 * ```json
 * {
 *   "notificationId": "string",
 *   "eventType": "va-deposit-transaction",
 *   "eventTime": "2026-06-01T12:00:00+09:00",
 *   "data": { "virtualAccountId": "string", "amount": "5800", ... }
 * }
 * ```
 *
 * NOTE(spec-confirm): Validate field names against real Sunabar webhook.
 */
export const WebhookEventSchema = z
  .object({
    /** GMO Aozora webhook notification ID (idempotency key). */
    notificationId: z.string(),
    /** Event type — currently only `va-deposit-transaction`. */
    eventType: WebhookEventNameSchema,
    /** ISO 8601 timestamp of when the event occurred. */
    eventTime: z.string(),
    /** Event payload (VA deposit details). */
    data: VaDepositTransactionSchema,
  })
  .passthrough();

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

/**
 * Permissive schema for webhook events not in the known literal union.
 * Use to handle future event types without hard failures.
 */
export const UnknownWebhookEventSchema = z
  .object({
    notificationId: z.string().optional(),
    eventType: z.string(),
    eventTime: z.string().optional(),
  })
  .passthrough();

export type UnknownWebhookEvent = z.infer<typeof UnknownWebhookEventSchema>;
