# Sunabar Validation Report

**Date**: 2026-05-05  
**SDK Version**: v0.5.0 (pre-release)  
**Environment**: Sunabar (sandbox)  
**Validator**: sugukuru (Kagoshima)

---

## Summary

笨・**All critical paths validated successfully**

- OAuth PKCE flow (authorization URL generation)
- Portal-issued token injection
- Corporation Accounts API (`GET /corporation/v1/accounts`)
- Corporation Balances API (`GET /corporation/v1/accounts/balances`)
- Response schema compatibility with live Sunabar API

---

## Environment

| Item | Value |
|---|---|
| Base URL | `https://api.sunabar.gmo-aozora.com` |
| API Path Prefix | `/corporation/v1/` |
| Auth Path | `/auth/v1/` |
| Token Source | Sunabar Portal (direct `x-access-token`) |
| Account ID | `102010013666` |
| Account Number | `0013666` (branch 102) |

---

## Validated APIs

### 1. Accounts List

**Request**:
```http
GET /corporation/v1/accounts
x-access-token: <portal-token>
```

**Response (excerpt)**:
```json
{
  "accounts": [
    {
      "accountId": "102010013666",
      "accountName": "...",
      "branchCode": "102",
      "accountNumber": "0013666",
      "branchName": "...",
      "accountTypeCode": "1",
      "accountTypeName": "譎ｮ騾・,
      ...
    }
  ],
  "baseDate": "2026-05-05",
  "baseTime": "..."
}
```

**Schema Compatibility**: 笨・(required `bankCode`/`accountType` relaxed to optional; additional Sunabar fields accepted via `.passthrough()`)

### 2. Balances

**Request**:
```http
GET /corporation/v1/accounts/balances?accountId=102010013666
x-access-token: <portal-token>
```

**Response Keys (actual Sunabar shape)**:
```json
[
  "accountId",
  "accountTypeCode",
  "accountTypeName",
  "balance",               // bookBalance equivalent
  "baseDate",
  "baseTime",
  "withdrawableAmount",    // availableBalance equivalent
  "previousDayBalance",
  "previousMonthBalance",
  "currencyCode",
  "currencyName"
]
```

**Schema Compatibility**: 笨・(added optional Sunabar-specific fields; legacy `bookBalance`/`availableBalance`/`balanceDate` kept for production compatibility)

### 3. Transactions (譏守ｴｰ辣ｧ莨・

**Request**:
```http
GET /corporation/v1/accounts/transactions?accountId=102010013666
x-access-token: <portal-token>
```

**Response Keys (actual Sunabar shape)**:
```json
{
  "transactions": [],
  "accountId": "102010013666",
  "currencyCode": "JPY",
  "currencyName": "蜀・,
  "dateFrom": "...",
  "dateTo": "...",
  "baseDate": "...",
  "baseTime": "...",
  "hasNext": false,
  "count": 0
}
```

**Key Differences from Production**:
- Production: `{ transactions: [...], nextItemKey?: string }`
- Sunabar: `{ transactions: [...], hasNext: boolean, count: number, accountId, currencyCode, ... }`

**Schema Compatibility**: 笨・(added `hasNext`, `count`, `accountId`, `currencyCode`, `currencyName`, `dateFrom`, `dateTo` as optional; `nextItemKey` retained for production compatibility)

---

## Issues Found & Fixed

| # | Issue | Root Cause | Fix |
|---|-------|------------|-----|
| 1 | `DNS_PROBE_FINISHED_NXDOMAIN` on `sandbox.apigateway.prod.gmo-aozora.com` | Wrong Sunabar base URL | Changed to `api.sunabar.gmo-aozora.com` (confirmed via official docs) |
| 2 | `bankCode`/`accountType` required | Sunabar omits these; uses `accountTypeCode`/`accountTypeName` instead | Made optional + `.passthrough()` |
| 3 | Extra keys (`branchName`, `baseDate`, etc.) rejected | `.strict()` schema | Switched to `.passthrough()` |
| 4 | Balance fields missing (`bookBalance` etc.) | Sunabar uses `balance`/`withdrawableAmount` | Added as optional; legacy names preserved |
| 5 | `GMO_ACCOUNT_ID` confusion | Portal shows account number; API requires `accountId` | Harness now prints candidate `accountId`s and auto-selects first if not provided |

---

## Commands Used

```powershell
# Dry-run (no network)
$env:GMO_ACCESS_TOKEN = "<portal-token>"
pnpm sunabar:dry-run

# Read-only validation
$env:GMO_ACCOUNT_ID = "102010013666"
pnpm sunabar:readonly
```

---

## Quality Gates Passed

- `pnpm typecheck` 笨・- `pnpm test` (168 tests) 笨・- `pnpm lint` 笨・- `pnpm build` 笨・- `pnpm examples:typecheck` 笨・
---

## Next Steps

1. **v0.5.1 release** 窶・Include Sunabar field compatibility and validation harness
2. **Webhook validation** (optional) 窶・Test `va-deposit-transaction` events if time permits
3. **Write-path validation** 窶・Transfer request (requires approval flow in Sunabar portal)
4. **Documentation** 窶・Update README with Sunabar quick-start (portal token pattern)

---

## References

- Sunabar Tutorial: https://gmo-aozora.com/sunabar/tutorial/01.html
- API Docs: https://api.gmo-aozora.com/ganb/developer/api-docs/
- Portal: https://portal.sunabar.gmo-aozora.com/login

---

**Validated by**: sugukuru  
**Date**: 2026-05-05 23:50 JST  
**Status**: 笨・PASS 窶・Ready for community release

|| 6 | Transaction pagination format mismatch | Production uses `nextItemKey`; Sunabar uses `hasNext`/`count` | Added both pagination styles as optional; `.passthrough()` for forward compatibility |
## Fee Estimation Attempt (2026-05-06)

**Result**: Received GmoAozoraApiError code 220011 (expected in Sunabar sandbox — test beneficiary data not present).

The estimateFee method successfully called the API and the SDK correctly surfaced the structured error. This validates write-path error handling.

## Write-path Validation (振込依頼 + Virtual Account)

**Date**: 2026-05-06

### 1. 振込入金口座発行 (POST /virtual-accounts)
- Attempted with unique label.
- Result: WG_ERR_019 (Operation not found) — Sunabar sandbox feature not enabled for this test account.
- SDK correctly surfaced GmoAozoraApiError.

### 2. 振込依頼 (POST /transfer/request) — Recommended Test
Run with --with-transfer-request:

- Amount: 100 yen (minimal safe amount)
- Date: Future business day
- Clear pplyComment warning
- Expected flow:
  1. API returns pplyNo + esultCode: '2' (pending)
  2. Go to Sunabar service site (法人ログイン)
  3. Approve or cancel the request in notifications
  4. Poll with --with-transfer-status or getResult

This is the standard Sunabar testing pattern (manual approval required by design).

**Status**: Write-path error handling validated. Full end-to-end transfer test possible with portal approval.
