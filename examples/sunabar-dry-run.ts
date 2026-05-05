/**
 * sunabar-dry-run.ts — Credential-safe Sunabar validation harness.
 *
 * Default mode performs no network calls and never prints secrets. It validates
 * local configuration, builds the PKCE authorization URL, and lists the readonly
 * checks that will run when explicitly enabled.
 *
 * Optional readonly API mode:
 *   GMO_CLIENT_ID=... GMO_CLIENT_SECRET=... GMO_ACCOUNT_ID=... GMO_ACCESS_TOKEN=... \
 *     npx tsx examples/sunabar-dry-run.ts --execute-readonly
 */
import {
  GmoAozoraApiError,
  GmoAozoraClient,
  InMemoryTokenStorage,
  PRIVATE_SCOPES,
  parseAmount,
} from '@sugukuru/gmo-aozora-sdk';

type HarnessMode = 'dry-run' | 'execute-readonly';

const mode: HarnessMode = process.argv.includes('--execute-readonly')
  ? 'execute-readonly'
  : 'dry-run';

const clientId = process.env['GMO_CLIENT_ID'];
const clientSecret = process.env['GMO_CLIENT_SECRET'];
const redirectUri = process.env['GMO_REDIRECT_URI'] ?? 'http://localhost:8080/callback';
const accountId = process.env['GMO_ACCOUNT_ID'];
const accessToken = process.env['GMO_ACCESS_TOKEN'];

function describeEnv(name: string, value: string | undefined): string {
  return value ? `${name}=set` : `${name}=missing`;
}

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function summarizeAccounts(
  accounts: readonly { accountId: string; branchCode: string; accountNumber: string }[],
): Array<{ accountId: string; branchCode: string; accountNumber: string }> {
  return accounts.map((account) => ({
    accountId: account.accountId,
    branchCode: account.branchCode,
    accountNumber: account.accountNumber,
  }));
}

const resolvedClientId = clientId ?? 'DRY_RUN_CLIENT_ID';
const resolvedClientSecret = clientSecret ?? 'DRY_RUN_CLIENT_SECRET';

const client = new GmoAozoraClient({
  environment: 'sunabar',
  clientId: resolvedClientId,
  clientSecret: resolvedClientSecret,
  redirectUri,
  defaultScopes: [PRIVATE_SCOPES.ACCOUNT, PRIVATE_SCOPES.OFFLINE_ACCESS],
});

const { url, session } = client.buildAuthorizationUrl();

console.log('Sunabar validation harness');
console.log('Mode:', mode);
console.log(
  'Environment:',
  [
    describeEnv('GMO_CLIENT_ID', clientId),
    describeEnv('GMO_CLIENT_SECRET', clientSecret),
    describeEnv('GMO_REDIRECT_URI', redirectUri),
    describeEnv('GMO_ACCOUNT_ID', accountId),
    describeEnv('GMO_ACCESS_TOKEN', accessToken),
  ].join(', '),
);
console.log('PKCE session prepared:', {
  stateLength: session.state.length,
  scope: session.scopes.join(' '),
  authorizationUrlHost: new URL(url).host,
});

if (mode === 'dry-run') {
  console.log('No network calls were made.');
  console.log(
    'Next: run with --execute-readonly after setting GMO_ACCESS_TOKEN and GMO_ACCOUNT_ID.',
  );
  process.exit(0);
}

const storage = new InMemoryTokenStorage();
const userId = 'sunabar-validation';
await storage.save(userId, {
  accessToken: requireEnv('GMO_ACCESS_TOKEN', accessToken),
  refreshToken: '',
  expiresAt: Date.now() + 3_600_000,
  tokenType: 'Bearer',
  scope: PRIVATE_SCOPES.ACCOUNT,
});

const readonlyClient = new GmoAozoraClient({
  environment: 'sunabar',
  clientId: clientId ?? 'SUNABAR_PORTAL_USER',
  // For portal-issued tokens, clientSecret is not used for token refresh.
  // Fall back to a placeholder so the constructor is satisfied.
  clientSecret: clientSecret ?? 'PORTAL_TOKEN_NO_REFRESH_NEEDED',
  redirectUri,
  defaultScopes: [PRIVATE_SCOPES.ACCOUNT, PRIVATE_SCOPES.OFFLINE_ACCESS],
  tokenStorage: storage,
}).useUser(userId);

const accounts = await readonlyClient.corporation.accounts.list();
console.log('Readonly accounts listed:', {
  accountCount: accounts.length,
  accounts: summarizeAccounts(accounts),
});

const readonlyAccountId = accountId ?? accounts[0]?.accountId;
if (!readonlyAccountId) {
  throw new Error('No accountId available. Set GMO_ACCOUNT_ID or ensure the token can list accounts.');
}

let balance;
try {
  balance = await readonlyClient.corporation.balances.get(readonlyAccountId);
} catch (e) {
  if (e instanceof GmoAozoraApiError && e.code === '220001') {
    console.error('Balance lookup failed: GMO_ACCOUNT_ID is not a valid accountId for this token.');
    console.error('Use one of the accountId values printed in "Readonly accounts listed" above.');
  }
  throw e;
}

console.log('Readonly Sunabar checks completed:', {
  accountCount: accounts.length,
  accountId: readonlyAccountId,
  bookBalance: balance ? parseAmount(balance.bookBalance).toString() : 'not returned',
});
