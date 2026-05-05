# Sunabar Validation Report

**Date**: 2026-05-05  
**SDK Version**: v0.5.0 (pre-release)  
**Environment**: Sunabar (sandbox)  
**Validator**: sugukuru (Kagoshima)

---

## Summary

✅ **All critical paths validated successfully**

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
      "accountTypeName": "普通",
      ...
    }
  ],
  "baseDate": "2026-05-05",
  "baseTime": "..."
}
```

**Schema Compatibility**: ✅ (required `bankCode`/`accountType` relaxed to optional; additional Sunabar fields accepted via `.passthrough()`)

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

**Schema Compatibility**: ✅ (added optional Sunabar-specific fields; legacy `bookBalance`/`availableBalance`/`balanceDate` kept for production compatibility)

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

- `pnpm typecheck` ✅
- `pnpm test` (168 tests) ✅
- `pnpm lint` ✅
- `pnpm build` ✅
- `pnpm examples:typecheck` ✅

---

## Next Steps

1. **v0.5.1 release** — Include Sunabar field compatibility and validation harness
2. **Webhook validation** (optional) — Test `va-deposit-transaction` events if time permits
3. **Write-path validation** — Transfer request (requires approval flow in Sunabar portal)
4. **Documentation** — Update README with Sunabar quick-start (portal token pattern)

---

## References

- Sunabar Tutorial: https://gmo-aozora.com/sunabar/tutorial/01.html
- API Docs: https://api.gmo-aozora.com/ganb/developer/api-docs/
- Portal: https://portal.sunabar.gmo-aozora.com/login

---

**Validated by**: sugukuru  
**Date**: 2026-05-05 23:50 JST  
**Status**: ✅ PASS — Ready for community release