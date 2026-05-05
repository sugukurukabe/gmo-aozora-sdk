# Official SDK Crosswalk — @sugukuru/gmo-aozora-sdk

> Source of truth: `オープンAPI連携について_ver2508.pdf` (categorisation),
> `gmoaozora/gmo-aozora-api-python` OpenAPI spec version 1.1.12 (model/endpoint names),
> `.cursor/rules/` (TypeScript implementation quality).
>
> Official SDKs are **not** used as runtime dependencies.
> See `README.md#why-not-the-official-sdk` for rationale.

---

## 1. API Class Mapping

| PDF Category | Python class | PHP class | Our namespace |
|---|---|---|---|
| 口座照会 | `AccountApi` | `AccountApi` | `corporation.accounts` |
| 残高照会 | `AccountApi` | `AccountApi` | `corporation.balances` |
| 入出金明細照会 | `AccountApi` | `AccountApi` | `corporation.transactions` |
| 振込入金口座 (VA) | `VirtualAccountApi` | `VirtualAccountApi` | `corporation.virtualAccounts` |
| 振込依頼 | `TransferApi` | `TransferApi` | `corporation.transfers` |
| 総合振込依頼 | `BulkTransferApi` | `BulkTransferApi` | `corporation.bulkTransfers` |

---

## 2. Transfer API — Operation Crosswalk

### `corporation.transfers`

| Our method | Python method | HTTP | Path | Request model | Response model |
|---|---|---|---|---|---|
| `create(input)` | `transfer_request_using_post` | POST | `/transfer/request` | `TransferRequest` | `TransferRequestResponse` |
| `getStatus(input)` | `transfer_status_using_get` | GET | `/transfer/status` | query params | `TransferStatusResponse` |
| `getResult(input)` | `transfer_request_result_using_get` | GET | `/transfer/request-result` | query params | `TransferRequestResultResponse` |
| `estimateFee(input)` | `transfer_fee_using_post` | POST | `/transfer/transferfee` | `TransferRequest` | `TransferFeeResponse` |
| `cancel(input)` | `transfer_cancel_using_post` | POST | `/transfer/cancel` | `TransferCancelRequest` | `TransferCancelResponse` |

### `corporation.bulkTransfers`

| Our method | Python method | HTTP | Path | Request model | Response model |
|---|---|---|---|---|---|
| `create(input)` | `bulk_transfer_request_using_post` | POST | `/bulktransfer/request` | `BulkTransferRequest` | `BulkTransferRequestResponse` |
| `getStatus(input)` | `bulk_transfer_status_using_get` | GET | `/bulktransfer/status` | query params | `BulkTransferStatusResponse` |
| `getResult(input)` | `bulk_transfer_request_result_using_get` | GET | `/bulktransfer/request-result` | query params | `TransferRequestResultResponse` |
| `estimateFee(input)` | `bulk_transfer_fee_using_post` | POST | `/bulktransfer/transferfee` | `BulkTransferRequest` | `TransferFeeResponse` |
| `cancel(input)` | `bulk_transfer_cancel_using_post` | POST | `/bulktransfer/cancel` | `TransferCancelRequest` | `TransferCancelResponse` |
| `pollResult(input, opts)` | *(not in official SDK)* | – | polling helper | – | `TransferResultResponse` |

---

## 3. Model Field Mapping

### `TransferItemSchema` (per-item transfer detail)

| JSON key | Python attr | Type | Constraints | Required |
|---|---|---|---|---|
| `itemId` | `item_id` | string | 1–99 numeric | optional (required if multi) |
| `transferAmount` | `transfer_amount` | string | numeric, ≥1 | **required** |
| `ediInfo` | `edi_info` | string | max 20 | optional |
| `beneficiaryBankCode` | `beneficiary_bank_code` | string | exactly 4 digits | **required** |
| `beneficiaryBankName` | `beneficiary_bank_name` | string | max 30 | optional |
| `beneficiaryBranchCode` | `beneficiary_branch_code` | string | exactly 3 digits | **required** |
| `beneficiaryBranchName` | `beneficiary_branch_name` | string | max 15 | optional |
| `accountTypeCode` | `account_type_code` | `'1'｜'2'｜'4'｜'9'` | 普通/当座/貯蓄/その他 | **required** |
| `accountNumber` | `account_number` | string | exactly 7 digits | **required** |
| `beneficiaryName` | `beneficiary_name` | string | max 48 | **required** |

### `TransferCreateInputSchema` (POST `/transfer/request` body)

| JSON key | Python attr | Type | Required |
|---|---|---|---|
| `accountId` | `account_id` | string 12–29 | **required** |
| `remitterName` | `remitter_name` | string 1–48 | optional |
| `transferDesignatedDate` | `transfer_designated_date` | `YYYY-MM-DD` | **required** |
| `transferDateHolidayCode` | `transfer_date_holiday_code` | `'1'｜'2'｜'3'` | optional (default 1) |
| `totalCount` | `total_count` | string | optional (required for multi) |
| `totalAmount` | `total_amount` | string | optional (required for multi) |
| `applyComment` | `apply_comment` | string 1–20 | optional |
| `transfers` | `transfers` | `TransferItem[]` | **required** |

### `TransferCreateResponseSchema` (POST response)

| JSON key | Python attr | Value notes |
|---|---|---|
| `accountId` | `account_id` | |
| `resultCode` | `result_code` | `'1'`=complete, `'2'`=incomplete |
| `applyNo` | `apply_no` | 16-char numeric string |
| `applyEndDatetime` | `apply_end_datetime` | ISO datetime, only when resultCode='1' |

### `TransferResultResponseSchema` (GET `/transfer/request-result`)

| JSON key | Value notes |
|---|---|
| `accountId` | |
| `resultCode` | `'1'`=complete, `'2'`=incomplete, `'8'`=expired |
| `applyNo` | 16-char |
| `applyEndDatetime` | only when resultCode='1' |

### `TransferCancelInputSchema`

| JSON key | Python attr | Notes |
|---|---|---|
| `accountId` | `account_id` | |
| `cancelTargetKeyClass` | `cancel_target_key_class` | `'1'`=振込申請, `'2'`=振込受付 (transfers); `'3'`=総合申請, `'4'`=総合受付 (bulk) |
| `applyNo` | `apply_no` | 16-char |

### `BulkTransferCreateInputSchema`

Same as `TransferCreateInputSchema` but:
- `totalCount` is **required** (not optional)
- `totalAmount` is **required**
- `transferDataName` (optional, max 10) added
- `bulkTransfers` (not `transfers`) as the array key

### `TransferFeeResponseSchema`

| JSON key | Notes |
|---|---|
| `accountId` | |
| `baseDate` | `YYYY-MM-DD` |
| `baseTime` | `HH:MM:SS+09:00` |
| `totalFee` | string numeric |
| `transferFeeDetails` | `TransferFeeDetail[]` |

### `TransferFeeDetailSchema`

| JSON key | Notes |
|---|---|
| `itemId` | string |
| `transferFee` | string numeric |

---

## 4. Day 2 Audit Notes (Phase 3)

### `BalanceSchema`
Current fields: `accountId`, `bookBalance`, `availableBalance`, `balanceDate`.
Python `AccountApi` returns balance data inside account responses — field names confirmed aligned.
**Status: OK**

### `VirtualAccountStatusSchema`
Current: `z.enum(['ACTIVE', 'INACTIVE', 'CLOSED'])`.
Python `VirtualAccountApi` doesn't specify status enum values in the model file (auto-generated).
**Status: NEEDS-SUNABAR-VALIDATION** — Enum values `'ACTIVE' | 'INACTIVE' | 'CLOSED'` are
plausible conventions; using `.passthrough()` at the schema level ensures parse does not fail
on unexpected values. Confirm exact strings against a real Sunabar VA response before v1.0.

### `TransactionSchema`
Current fields: `transactionId`, `transactionDate`, `transactionType`, `amount`, `balance`, `description?`, `counterpartyName?`, `counterpartyAccountNumber?`.
Python model not directly reviewed, but fields match standard Japanese bank transaction API conventions.
**Status: NEEDS-SUNABAR-VALIDATION** — The field `transactionId` may be `trnId` or `transactionSeq`
in the actual JSON. Confirm field names against a real Sunabar transaction list response before v1.0.
The schema uses `.strict()` — a field name mismatch will cause parse failures in production.
**Mitigation until confirmed:** Change `TransactionSchema` to `.passthrough()` for resilience.

---

## 5. Webhook Spec Audit (Day 5)

### Signature Encoding

GMO Aozora sends the HMAC-SHA256 digest as a **base64-encoded** string in the
`x-webhook-signature` header. Our `verify.ts` correctly uses:

```ts
const expected = createHmac('sha256', secret).update(rawBody).digest(); // raw bytes
const actual = Buffer.from(signature, 'base64');                        // decode from base64
```

**Status: Fixed (base64, was incorrectly hex in prior version)**

### Signature Header Name

Default header: `x-webhook-signature`. The `WebhookMiddlewareOptions.headerName` parameter
allows override if a different bank uses a different header name.

**Status: Fixed (was `x-gmo-signature`, now `x-webhook-signature`)**

### Webhook Event Envelope Fields

Based on `docs/skills/gmo-aozora-api.md`:

| Our field | Docs field | Status |
|---|---|---|
| `notificationId` | `notificationId` | ✅ aligned |
| `eventType` | `eventType` | ✅ aligned (was `eventName`, fixed) |
| `eventTime` | `eventTime` | ✅ aligned (was `occurredAt`, fixed) |
| `data.virtualAccountId` | `data.virtualAccountId` | ✅ aligned (was `data.accountId`, fixed) |
| `data.amount` | `data.amount` | ✅ aligned |
| `data.senderName` | `data.senderName` | ✅ aligned (newly added) |
| `data.transactionId` | `data.transactionId` | ✅ aligned |

**Status: NEEDS-SUNABAR-VALIDATION** — Field names confirmed against internal skill doc, but
not yet validated against a real Sunabar webhook delivery. Use `.passthrough()` on all schemas
to avoid parse failures if GMO adds or renames fields in future versions.

---

## 6. Why Not the Official SDKs?

| SDK | Language | TypeScript | Zod | Retry | Domain helpers |
|---|---|---|---|---|---|
| `gmo-aozora-api-python` | Python | – | – | – | – |
| `gmo-aozora-api-nodejs` | JavaScript (Node 10+) | partial | – | – | – |
| `gmo-aozora-api-php` | PHP | – | – | – | – |
| **@sugukuru/gmo-aozora-sdk** | **TypeScript strict** | **✓** | **Zod v4** | **✓** | **✓** |

The official SDKs are Swagger Codegen output. They have no retry, no rate limiting,
no KMS token storage, no Zengin file generation, and no `pollResult` helper.
We use them only to verify endpoint paths, model names, and field names.

---

## 6. Out of Scope (v1.0)

The following API categories exist in the PDF but are not implemented in v1.0:

- 個人向け API (personal banking)
- 定額自動振込 (scheduled transfers)
- 法人口座情報変更
- Webhook event types beyond `va-deposit-transaction`

These are tracked in `ROADMAP.md`.
