/**
 * payroll-batch.ts — Submit a payroll bulk transfer (給与振込) and wait for the result.
 *
 * This example demonstrates the full production flow used at Sugukuru Co., Ltd.
 * to pay 150+ Indonesian Specified Skilled Workers every month:
 *   1. Build a Zengin format file for audit/archiving
 *   2. Submit a bulkTransfers.create() request
 *   3. Poll for the final result with pollResult()
 *
 * Environment variables required:
 *   GMO_CLIENT_ID       — OAuth client ID
 *   GMO_CLIENT_SECRET   — OAuth client secret
 *   GMO_ACCOUNT_ID      — Source account ID
 *   GMO_ACCESS_TOKEN    — Pre-obtained access token with private:transfer scope
 *
 * Run: npx tsx examples/payroll-batch.ts
 */
import { GmoAozoraClient, InMemoryTokenStorage, formatAmount } from '@sugukuru/gmo-aozora-sdk';
import { buildZenginFile, toHalfWidthKana } from '@sugukuru/zengin-format';
import { writeFileSync } from 'node:fs';

const clientId = process.env['GMO_CLIENT_ID'] ?? 'YOUR_CLIENT_ID';
const clientSecret = process.env['GMO_CLIENT_SECRET'] ?? 'YOUR_CLIENT_SECRET';
const accountId = process.env['GMO_ACCOUNT_ID'] ?? 'YOUR_ACCOUNT_ID';
const accessToken = process.env['GMO_ACCESS_TOKEN'];

if (!accessToken) {
  console.error('Set GMO_ACCESS_TOKEN environment variable.');
  process.exit(1);
}

// Sample payroll data (replace with real employee data in production)
const employees = [
  {
    name: 'スプリアント タロウ',
    bankCode: '0001',
    bankName: 'ミズホ',
    branchCode: '001',
    branchName: 'ホンテン',
    accountTypeCode: '1' as const,
    accountNumber: '1234567',
    amount: BigInt(250000),
  },
  {
    name: 'インドネシア ハナコ',
    bankCode: '0009',
    bankName: 'エスエムビーシー',
    branchCode: '002',
    branchName: 'シンジュク',
    accountTypeCode: '1' as const,
    accountNumber: '7654321',
    amount: BigInt(220000),
  },
];

const today = new Date();
const mmdd = today.toISOString().slice(5, 10).replace('-', '');
const yyyymmdd = today.toISOString().slice(0, 10);
const totalAmount = employees.reduce((sum, e) => sum + e.amount, BigInt(0));

// Step 1: Build Zengin file for audit trail
const zenginBuf = buildZenginFile({
  shorui: '11',
  transferDate: mmdd,
  remitter: {
    code: '1234567890',
    name: toHalfWidthKana('スギクル カブシキカイシャ'),
    bankCode: '0310',
    bankName: toHalfWidthKana('ジーエムオーアオゾラ'),
    branchCode: '001',
    branchName: toHalfWidthKana('ホンテン'),
    accountTypeCode: '1',
    accountNumber: '1234567',
  },
  records: employees.map((e) => ({
    bankCode: e.bankCode,
    bankName: toHalfWidthKana(e.bankName),
    branchCode: e.branchCode,
    branchName: toHalfWidthKana(e.branchName),
    accountTypeCode: e.accountTypeCode,
    accountNumber: e.accountNumber,
    beneficiaryName: toHalfWidthKana(e.name),
    amount: e.amount,
  })),
});

const zenginPath = `payroll-${yyyymmdd}.dat`;
writeFileSync(zenginPath, zenginBuf);
console.log(`Zengin file written: ${zenginPath} (${zenginBuf.byteLength} bytes)`);

// Step 2: Setup SDK client
const storage = new InMemoryTokenStorage();
const userId = 'default';
await storage.save(userId, {
  accessToken,
  refreshToken: '',
  expiresAt: Date.now() + 3600_000,
  tokenType: 'Bearer',
  scope: 'private:transfer',
});

const sdkClient = new GmoAozoraClient({
  clientId,
  clientSecret,
  redirectUri: 'http://localhost/callback',
  environment: 'sunabar',
  tokenStorage: storage,
});

const userClient = sdkClient.useUser(userId);

// Step 3: Submit bulk transfer
console.log(
  `Submitting bulk transfer: ${employees.length} employees, total ¥${totalAmount.toLocaleString()}`,
);

const createResp = await userClient.corporation.bulkTransfers.create({
  accountId,
  transferDesignatedDate: yyyymmdd,
  totalCount: String(employees.length),
  totalAmount: formatAmount(totalAmount),
  bulkTransfers: employees.map((e, i) => ({
    itemId: String(i + 1).padStart(4, '0'),
    beneficiaryBankCode: e.bankCode,
    beneficiaryBankName: toHalfWidthKana(e.bankName),
    beneficiaryBranchCode: e.branchCode,
    beneficiaryBranchName: toHalfWidthKana(e.branchName),
    accountTypeCode: e.accountTypeCode,
    accountNumber: e.accountNumber,
    beneficiaryName: toHalfWidthKana(e.name),
    transferAmount: e.amount.toString(),
  })),
});

console.log(`Created: applyNo=${createResp.applyNo}, resultCode=${createResp.resultCode}`);

// Step 4: Poll for final result
if (createResp.resultCode === '2') {
  console.log('Processing... polling for result (max 60s)');
  const finalResult = await userClient.corporation.bulkTransfers.pollResult(
    { accountId, applyNo: createResp.applyNo },
    { timeoutMs: 60_000, intervalMs: 3_000 },
  );
  console.log(
    `Final result: ${finalResult.resultCode === '1' ? '✓ Completed' : '✗ Failed/Expired'}`,
  );
} else {
  console.log(`Immediate result: ${createResp.resultCode === '1' ? '✓ Completed' : '✗ Failed'}`);
}
