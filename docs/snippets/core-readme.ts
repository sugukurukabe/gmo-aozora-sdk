import { GmoAozoraClient, InMemoryTokenStorage, PRIVATE_SCOPES } from '@sugukuru/gmo-aozora-sdk';

const storage = new InMemoryTokenStorage();
const client = new GmoAozoraClient({
  clientId: process.env['GMO_CLIENT_ID'] ?? 'YOUR_CLIENT_ID',
  clientSecret: process.env['GMO_CLIENT_SECRET'] ?? 'YOUR_CLIENT_SECRET',
  redirectUri: 'http://localhost:8080/callback',
  environment: 'sunabar',
  tokenStorage: storage,
  defaultScopes: [PRIVATE_SCOPES.ACCOUNT, PRIVATE_SCOPES.TRANSFER, PRIVATE_SCOPES.OFFLINE_ACCESS],
});

const { url, session } = client.buildAuthorizationUrl();
console.log('Open this URL:', url);

const userClient = client.useUser('user-1');
await userClient.exchangeCode({
  code: 'CODE_FROM_REDIRECT',
  state: session.state,
  session,
});

const accountId = '123456789012';
const balance = await userClient.corporation.balances.get(accountId);
console.log('Balance:', balance?.bookBalance);

for await (const tx of userClient.corporation.transactions.iterate({
  accountId,
  dateFrom: '2026-05-01',
  dateTo: '2026-05-31',
})) {
  console.log(tx.transactionDate, tx.amount);
}

const bulk = await userClient.corporation.bulkTransfers.create({
  accountId,
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

await userClient.corporation.bulkTransfers.pollResult(
  { accountId, applyNo: bulk.applyNo },
  { intervalMs: 60_000, timeoutMs: 7_200_000 },
);
