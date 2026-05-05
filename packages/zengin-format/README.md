# @sugukuru/zengin-format

Zengin format (全銀協) file generation for Japanese bank transfers.

**Works with any Japanese bank** — not GMO Aozora-specific. Use this package
standalone if you need to generate Zengin `.dat` files for any bank.

## Install

```bash
npm install @sugukuru/zengin-format
```

## Usage

```typescript
import { buildZenginFile } from '@sugukuru/zengin-format';

const buf = buildZenginFile({
  shorui: '11',           // '11' = 給与 (payroll) | '12' = 賞与 (bonus)
  transferDate: '0525',   // MMDD
  remitter: {
    code: '0000000001',
    name: 'ｽｸﾞｸﾙ ｶﾌﾞｼｷｶﾞｲｼｬ',  // half-width kana
    bankCode: '0310',
    bankName: 'ｼﾞｰｴﾑｵｰｱｵｿﾞﾗ',
    branchCode: '001',
    branchName: 'ﾎﾝﾃﾝ',
    accountTypeCode: '1',
    accountNumber: '1234567',
  },
  records: [
    {
      bankCode: '0001',
      bankName: 'ﾐｽﾞﾎ',
      branchCode: '100',
      branchName: 'ﾎﾝﾃﾝ',
      accountTypeCode: '1',
      accountNumber: '7654321',
      beneficiaryName: 'ﾔﾏﾀﾞ ﾀﾛｳ',
      amount: BigInt(250000),
    },
  ],
});

// Write to file
import { writeFileSync } from 'node:fs';
writeFileSync('payroll-2026-05.dat', buf);
```

## Features

- **Type-safe**: `ZenginShorui = '11' | '12'` (never plain string)
- **Multi-bank**: works with any Japanese bank — not GMO-specific
- **Zero external deps**: custom Shift_JIS encoder handles ASCII + half-width kana
- **Validated**: every record asserted at exactly 120 bytes
- **Accepts bigint amounts**: `BigInt(250000)` or string `"250000"`

## Format

Generates Zengin 固定長レコード方式 (全銀協標準通信プロトコル):
- Header record (1): レコード区分 `'1'`
- Data records (N): レコード区分 `'2'`
- Trailer record (1): レコード区分 `'8'`
- End record (1): レコード区分 `'9'`
- Every record: exactly **120 bytes** in Shift_JIS (CP932 subset)

## License

Apache-2.0 — Sugukuru Co., Ltd.
