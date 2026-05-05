import { writeFileSync } from 'node:fs';
import { buildZenginFile } from '@sugukuru/zengin-format';

const buf = buildZenginFile({
  shorui: '11',
  transferDate: '0525',
  remitter: {
    code: '0000000001',
    name: 'ｽｸﾞｸﾙ ｶﾌﾞｼｷｶﾞｲｼｬ',
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
      amount: 250000n,
    },
  ],
});

writeFileSync('payroll-2026-05.dat', buf);
