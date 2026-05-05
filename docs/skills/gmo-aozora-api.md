# GMO Aozora API Reference Skill

> Use this skill when answering questions about GMO Aozora's Open API
> specification, endpoint behavior, or error handling.

## Spec Version

This skill covers **API spec v1.8.0**. If the spec version changes, update
this file and bump the SDK minor version.

## Key Corrections vs Common Assumptions

These are the most common mistakes developers make when approaching the API
for the first time. Verify these before implementing any endpoint.

| What developers assume | What the spec actually says |
|---|---|
| `Authorization: Bearer <token>` | `x-access-token: <token>` |
| `application/json` | `application/json;charset=UTF-8` |
| `/api/v1/` prefix | `/ganb/api/corporation/v1/` |
| Amounts as numbers | Amounts as strings (`"5800"`) |
| Page-based pagination | `nextItemKey` token pagination |
| Scope: `corporation:account` | Scope: `private:account` |

## Pagination

GMO uses cursor-based pagination via `nextItemKey`. When a response includes
`nextItemKey`, pass it as a query parameter in the next request to get the
next page. Absence of `nextItemKey` means no more records.

Never assume page count or total record count.

## Bulk Transfer Lifecycle

Bulk transfers are asynchronous:
1. POST to create → returns `requestId`
2. GET status → `processing` | `completed` | `failed`
3. GET result → individual item outcomes when status = `completed`

Poll status every 60 seconds. After 2 hours, give up and throw `GmoAozoraTimeoutError`.

## Webhook Payload Structure

```json
{
  "notificationId": "string",
  "eventType": "va-deposit-transaction",
  "eventTime": "2026-06-01T12:00:00+09:00",
  "data": {
    "virtualAccountId": "string",
    "amount": "5800",
    "senderName": "ｽｸﾞｸﾙ ｶﾌﾞｼｷｶﾞｲｼｬ",
    "transactionId": "string"
  }
}
```

Signature header: `x-webhook-signature` (base64-encoded HMAC-SHA256)

## Official Documentation vs SDK

Differences between the GMO Aozora Node SDK and this SDK's behavior
are documented in `.cursor/rules/50-anti-patterns-from-official.mdc`.
