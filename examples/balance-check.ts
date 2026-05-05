/**
 * balance-check.ts — Fetch account balance for a single account.
 *
 * Environment variables required:
 *   GMO_CLIENT_ID       — OAuth client ID
 *   GMO_CLIENT_SECRET   — OAuth client secret
 *   GMO_ACCOUNT_ID      — The account ID to check
 *   GMO_ACCESS_TOKEN    — A pre-obtained access token (sunabar sandbox)
 *
 * Run: npx tsx examples/balance-check.ts
 */
import { GmoAozoraClient, InMemoryTokenStorage, parseAmount } from '@sugukuru/gmo-aozora-sdk';

const clientId = process.env['GMO_CLIENT_ID'] ?? 'YOUR_CLIENT_ID';
const clientSecret = process.env['GMO_CLIENT_SECRET'] ?? 'YOUR_CLIENT_SECRET';
const accountId = process.env['GMO_ACCOUNT_ID'] ?? 'YOUR_ACCOUNT_ID';
const accessToken = process.env['GMO_ACCESS_TOKEN'];

if (!accessToken) {
  console.error('Set GMO_ACCESS_TOKEN environment variable (sunabar sandbox token).');
  process.exit(1);
}

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
const balance = await userClient.corporation.balances.get(accountId);

if (!balance) {
  console.log('No balance data returned for accountId:', accountId);
  process.exit(0);
}

const book = parseAmount(balance.bookBalance ?? '0');
const available = parseAmount(balance.availableBalance ?? '0');

console.log('Account Balance Report');
console.log('======================');
console.log(`Account ID   : ${balance.accountId}`);
console.log(`Balance Date : ${balance.balanceDate ?? 'not returned'}`);
console.log(`Book Balance : ¥${book.toLocaleString()}`);
console.log(`Available    : ¥${available.toLocaleString()}`);
