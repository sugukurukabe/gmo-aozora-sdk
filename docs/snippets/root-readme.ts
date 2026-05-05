import { GmoAozoraClient, PRIVATE_SCOPES, parseAmount } from '@sugukuru/gmo-aozora-sdk';

const client = new GmoAozoraClient({
  environment: 'sunabar',
  clientId: process.env['GMO_CLIENT_ID'] ?? 'YOUR_CLIENT_ID',
  clientSecret: process.env['GMO_CLIENT_SECRET'] ?? 'YOUR_CLIENT_SECRET',
  redirectUri: 'https://app.example.com/callback',
  defaultScopes: [PRIVATE_SCOPES.ACCOUNT, PRIVATE_SCOPES.OFFLINE_ACCESS],
});

const user = client.useUser('user-123');

const balance = await user.corporation.balances.get('123456789012');
console.log(balance?.bookBalance);

let total = 0n;
for await (const tx of user.corporation.transactions.iterate({ accountId: '123456789012' })) {
  total += parseAmount(tx.amount);
}
console.log(`Total: ${total}`);

const bulk = await user.corporation.bulkTransfers.create({
  accountId: '123456789012',
  transferDesignatedDate: '2026-05-25',
  totalCount: '1',
  totalAmount: '250000',
  bulkTransfers: [
    {
      itemId: '1',
      transferAmount: '250000',
      beneficiaryBankCode: '0310',
      beneficiaryBranchCode: '001',
      accountTypeCode: '1',
      accountNumber: '1234567',
      beneficiaryName: 'TANAKA TARO',
    },
  ],
});

if (bulk.resultCode === '2') {
  const final = await user.corporation.bulkTransfers.pollResult(
    { accountId: '123456789012', applyNo: bulk.applyNo },
    { timeoutMs: 60_000 },
  );
  console.log('Completed:', final.applyNo);
}

const transferInput = {
  accountId: '123456789012',
  transferDesignatedDate: '2026-05-15',
  transfers: [
    {
      transferAmount: '50000',
      beneficiaryBankCode: '0001',
      beneficiaryBranchCode: '001',
      accountTypeCode: '1' as const,
      accountNumber: '1234567',
      beneficiaryName: 'SUZUKI HANAKO',
    },
  ],
};

const fee = await user.corporation.transfers.estimateFee(transferInput);
console.log('Fee:', fee.totalFee);

await user.corporation.transfers.create(transferInput);
