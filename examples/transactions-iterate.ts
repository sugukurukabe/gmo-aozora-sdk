/**
 * transactions-iterate.ts — Stream all transactions for an account using async iteration.
 *
 * Environment variables required:
 *   GMO_CLIENT_ID       — OAuth client ID
 *   GMO_CLIENT_SECRET   — OAuth client secret
 *   GMO_ACCOUNT_ID      — The account ID to query
 *   GMO_ACCESS_TOKEN    — A pre-obtained access token (sunabar sandbox)
 *   GMO_DATE_FROM       — Optional, YYYY-MM-DD (default: 30 days ago)
 *   GMO_DATE_TO         — Optional, YYYY-MM-DD (default: today)
 *
 * Run: npx tsx examples/transactions-iterate.ts
 */
import { GmoAozoraClient, InMemoryTokenStorage, parseAmount } from '@sugukuru/gmo-aozora-sdk';

const clientId = process.env['GMO_CLIENT_ID'] ?? 'YOUR_CLIENT_ID';
const clientSecret = process.env['GMO_CLIENT_SECRET'] ?? 'YOUR_CLIENT_SECRET';
const accountId = process.env['GMO_ACCOUNT_ID'] ?? 'YOUR_ACCOUNT_ID';
const accessToken = process.env['GMO_ACCESS_TOKEN'];

if (!accessToken) {
  console.error('Set GMO_ACCESS_TOKEN environment variable.');
  process.exit(1);
}

const today = new Date();
const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
const dateFrom = process.env['GMO_DATE_FROM'] ?? thirtyDaysAgo.toISOString().slice(0, 10);
const dateTo = process.env['GMO_DATE_TO'] ?? today.toISOString().slice(0, 10);

const storage = new InMemoryTokenStorage();
const userId = 'default';
await storage.save(userId, {
  accessToken,
  refreshToken: '',
  expiresAt: Date.now() + 3600_000,
  tokenType: 'Bearer',
  scope: 'private:account',
});

const client = new GmoAozoraClient({
  clientId,
  clientSecret,
  redirectUri: 'http://localhost/callback',
  environment: 'sunabar',
  tokenStorage: storage,
});

const userClient = client.useUser(userId);

console.log(`Fetching transactions for ${accountId} from ${dateFrom} to ${dateTo}`);
console.log('Date       | Type | Amount       | Description');
console.log('-----------|------|--------------|---------------------------');

let count = 0;
for await (const tx of userClient.corporation.transactions.iterate({
  accountId,
  dateFrom,
  dateTo,
})) {
  const amount = parseAmount(tx.amount);
  const sign = tx.transactionType === 'debit' ? '-' : '+';
  console.log(
    `${tx.transactionDate} | ${tx.transactionType.padEnd(4)} | ${sign}¥${amount.toLocaleString().padStart(12)} | ${tx.description ?? ''}`,
  );
  count++;
}

console.log(`\nTotal: ${count} transactions`);
