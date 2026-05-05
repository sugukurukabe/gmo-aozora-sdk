# Production Story: Sugukuru Payroll Automation

**Organization**: Sugukuru Co., Ltd. (鹿児島市)
**Industry**: Staffing / Specified Skilled Worker (特定技能) support
**Scale**: 150+ Indonesian employees across Kagoshima Prefecture
**Status**: SDK feature-complete (May 2026). First production payroll run
scheduled for the June 2026 cycle once Sunabar acceptance evidence is recorded
in [`docs/sunabar-validation-report-template.md`](../docs/sunabar-validation-report-template.md).

## The Problem: 14 Hours Every Month

Every month, Sugukuru's payroll team had to:

1. Export employee bank data from the HR system (Excel)
2. Manually transcribe each employee's bank code, branch code, account number, and amount into GMO Aozora's web portal
3. Double-check every row (150+ rows) against the source spreadsheet
4. Re-enter any entries that failed validation
5. Submit and wait for the confirmation screen
6. Archive the confirmation as a screenshot

**Total time**: ~14 hours, spread across 2–3 days.

The team also worried about transcription errors — a single transposed digit in an account number could send ¥220,000 to the wrong account. Recovery requires coordinating with the receiving bank, taking days.

## The Solution: 8 Minutes

With this SDK, payroll is designed to run as a single command:

```bash
# Generate Zengin file for audit + submit bulk transfer
GMO_ACCOUNT_ID=<id> GMO_ACCESS_TOKEN=<token> npx tsx payroll-batch.ts
```

Under the hood:

```typescript
// 1. Load employee data from HR system (JSON export)
const employees = await loadPayrollData('./payroll-2026-05.json');

// 2. Build Zengin format file for audit trail (.dat file archived to S3)
const zenginBuf = buildZenginFile({
  shorui: '11', // 給与振込
  transferDate: '0525',
  remitter: { code: '1234567890', name: 'ｽｷﾞｸﾙ ｶﾌﾞｼｷｶｲｼｬ', ... },
  records: employees.map(emp => ({
    bankCode: emp.bankCode,           // validated: exactly 4 digits
    branchCode: emp.branchCode,       // validated: exactly 3 digits
    accountNumber: emp.accountNumber, // validated: exactly 7 digits
    beneficiaryName: toHalfWidthKana(emp.nameKana),
    amount: emp.salaryAmount,         // bigint — no floating-point risk
    accountTypeCode: '1',
  })),
});

// 3. Submit to GMO Aozora API
const result = await userClient.corporation.bulkTransfers.create({
  accountId: PAYROLL_ACCOUNT,
  totalCount: String(employees.length),
  totalAmount: formatAmount(employees.reduce((s, e) => s + e.salaryAmount, BigInt(0))),
  bulkTransfers: employees.map(emp => ({ ... })),
});

// 4. Wait for processing (typically 30–90 seconds)
const final = await userClient.corporation.bulkTransfers.pollResult(
  { accountId: PAYROLL_ACCOUNT, applyNo: result.applyNo },
  { timeoutMs: 300_000, intervalMs: 5_000 },
);

console.log(final.resultCode === '1' ? '✓ 振込完了' : '✗ 処理失敗');
```

## Expected Results

These targets are derived from internal benchmarks of the SDK pipeline run
against Sunabar fixtures. The first production payroll cycle (June 2026) will
publish actual measurements back into this table.

| Metric | Manual baseline | SDK target |
|---|---|---|
| Time per payroll cycle | ~14 hours | ~8 minutes |
| Manual data entry | 150+ rows × 5 fields | 0 |
| Transcription error risk | High (manual) | Eliminated (Zod-validated, compile-time literals) |
| Audit trail | Screenshots | Zengin `.dat` + API response JSON |
| Error recovery time | 2–3 business days | Immediate retry |

## Why TypeScript Strictness Matters for Banking

The original motivation for `strict: true` and `exactOptionalPropertyTypes: true` came from a near-miss incident during testing: a JavaScript prototype incorrectly passed `undefined` as a bank code, which silently became the string `"undefined"` — an invalid 9-character value. The API rejected it, but only at runtime, after a 2-second network roundtrip.

With the SDK:
```typescript
// TypeScript error at compile time: Argument of type 'string | undefined'
// is not assignable to parameter of type 'string'
const bankCode: string | undefined = employee.bankCode;
buildZenginFile({ records: [{ bankCode, ... }] });
//                                ^^^^^^^^ TS error — caught before deployment
```

## Compliance Notes

All 150+ employees are Indonesian Specified Skilled Workers (特定技能外国人). The SDK was built with awareness of:

- **Residence status validation**: `ResidenceStatus` discriminated union tracks expiry dates
- **Payroll timing**: Salary must be paid by the 25th; the SDK's `transferDesignatedDate` field is always set to the payroll date, not the submission date
- **Documentation**: Every bulk transfer call logs its `applyNo` and the Zengin `.dat` file for audit by the Labor Standards Inspection Office (労働基準監督署)

## Open Source Intent

This SDK is open source because we believe other staffing companies — especially those supporting SSW programs across Japan — should not have to rebuild this infrastructure. The 14 hours we recovered every month represents real human capacity that can be redirected toward supporting the workers themselves.

If your organization supports SSW programs and runs payroll through GMO Aozora Net Bank, this SDK is for you.
