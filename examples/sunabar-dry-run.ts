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
  GmoAozoraValidationError,
  GmoAozoraClient,
  InMemoryTokenStorage,
  PRIVATE_SCOPES,
  parseAmount,
} from '@sugukuru/gmo-aozora-sdk';

type HarnessMode = 'dry-run' | 'execute-readonly';

const mode: HarnessMode = process.argv.includes('--execute-readonly')
  ? 'execute-readonly'
  : 'dry-run';

const withTransactions = process.argv.includes('--with-transactions');
const withVirtualAccounts = process.argv.includes('--with-virtual-accounts');
const withTransferStatus = process.argv.includes('--with-transfer-status');
const withBulkTransferStatus = process.argv.includes('--with-bulk-transfer-status');
const withCreateVirtualAccount = process.argv.includes('--create-virtual-account');
const withTransferRequest = process.argv.includes('--with-transfer-request');

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

function summarizeBalance(balance: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!balance) {
    return { returned: false };
  }

  const bookBalance = typeof balance['bookBalance'] === 'string' ? balance['bookBalance'] : undefined;
  const availableBalance =
    typeof balance['availableBalance'] === 'string' ? balance['availableBalance'] : undefined;

  return {
    returned: true,
    keys: Object.keys(balance),
    accountId: balance['accountId'],
    bookBalance: bookBalance ? parseAmount(bookBalance).toString() : 'not returned',
    availableBalance: availableBalance ? parseAmount(availableBalance).toString() : 'not returned',
    balanceDate: balance['balanceDate'] ?? 'not returned',
  };
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
  balance: summarizeBalance(balance),
});

if (withTransactions) {
  console.log('\nFetching transactions (first page only)...');
  const txResponse = await readonlyClient.corporation.transactions.list({
    accountId: readonlyAccountId,
  });
  console.log('Transactions response keys:', Object.keys(txResponse));
  console.log('Transaction count (first page):', txResponse.transactions.length);
  if (txResponse.transactions.length > 0) {
    console.log('First transaction sample keys:', Object.keys(txResponse.transactions[0]));
  }
  console.log('nextItemKey:', txResponse.nextItemKey ?? 'none (single page)');
}

if (withVirtualAccounts) {
  console.log('\nFetching virtual accounts (振込入金口座一覧)...');
  try {
    const vaResponse = await readonlyClient.corporation.virtualAccounts.list();
    console.log('Virtual accounts response keys:', Object.keys(vaResponse));
    console.log('Virtual account count:', vaResponse.virtualAccounts.length);
    if (vaResponse.virtualAccounts.length > 0) {
      console.log('First virtual account sample keys:', Object.keys(vaResponse.virtualAccounts[0]));
    }
  } catch (e) {
    if (e instanceof GmoAozoraValidationError) {
      console.error('Virtual accounts validation failed. Issues:');
      console.error(JSON.stringify(e.issues, null, 2));
    } else if (e instanceof GmoAozoraApiError) {
      console.error(`Virtual accounts list failed: ${e.code}: ${e.message}`);
      console.error('(This feature may not be enabled in the current Sunabar sandbox account.)');
    } else {
      console.error('Virtual accounts list failed:', String(e));
    }
  }
}

if (withTransferStatus) {
  console.log('\nFetching transfer status (振込状況照会)...');
  try {
    const statusResponse = await readonlyClient.corporation.transfers.getStatus({
      accountId: readonlyAccountId,
      queryKeyClass: '1', // 振込申請照会
    });
    console.log('Transfer status response keys:', Object.keys(statusResponse));
    console.log('Transfer status list count:', statusResponse.transferStatusList.length);
    if (statusResponse.transferStatusList.length > 0) {
      console.log('First status item keys:', Object.keys(statusResponse.transferStatusList[0]));
    }
  } catch (e) {
    const message = e instanceof GmoAozoraApiError ? `${e.code}: ${e.message}` : String(e);
    console.error('Transfer status query failed:', message);
  }
}

if (withBulkTransferStatus) {
  console.log('\nFetching bulk transfer status (総合振込状況照会)...');
  try {
    const bulkStatusResponse = await readonlyClient.corporation.bulkTransfers.getStatus({
      accountId: readonlyAccountId,
      queryKeyClass: '2', // 振込一括照会 (date range friendly)
      dateFrom: '2026-05-01',
      dateTo: '2026-05-06',
    });
    console.log('Bulk transfer status response keys:', Object.keys(bulkStatusResponse));
    const list = bulkStatusResponse.transferStatusList ?? [];
    console.log('Bulk transfer status list count:', list.length);
  } catch (e) {
    if (e instanceof GmoAozoraValidationError) {
      console.error('Bulk transfer status validation failed. Issues:');
      console.error(JSON.stringify(e.issues, null, 2));
    } else if (e instanceof GmoAozoraApiError) {
      console.error(`Bulk transfer status query failed: ${e.code}: ${e.message}`);
    } else {
      console.error('Bulk transfer status query failed:', String(e));
    }
  }
}

if (withCreateVirtualAccount) {
  console.log('\nCreating a virtual account (振込入金口座発行) — this is a write operation...');
  const uniqueLabel = `Sunabar-Validation-${Date.now()}`;
  try {
    const created = await readonlyClient.corporation.virtualAccounts.create({
      accountId: readonlyAccountId,
      label: uniqueLabel,
    });
    console.log('Virtual account created successfully!');
    console.log('Created virtual account keys:', Object.keys(created));
    console.log('virtualAccountNumber:', created.virtualAccountNumber);
    console.log('status:', created.status);
  } catch (e) {
    if (e instanceof GmoAozoraValidationError) {
      console.error('Create virtual account validation failed. Issues:');
      console.error(JSON.stringify(e.issues, null, 2));
    } else if (e instanceof GmoAozoraApiError) {
      console.error(`Create virtual account failed: ${e.code}: ${e.message}`);
      console.error('(This may require approval in the Sunabar portal or test data limitations.)');
    } else {
      console.error('Create virtual account failed:', String(e));
    }
  }
}

if (withTransferRequest) {
  console.log('\n=== WRITE OPERATION: 振込依頼 (Transfer Request) ===');
  console.log('WARNING: This will submit a real transfer request in Sunabar.');
  console.log('You MUST approve (or cancel) it manually in the Sunabar service site.');
  console.log('Using 100 yen for safety. Please approve ONLY if you intend to test.');

  const transferDate = '2026-05-08'; // assume business day; adjust if needed
  try {
    const transferRes = await readonlyClient.corporation.transfers.create({
      accountId: readonlyAccountId,
      remitterName: 'Sunabar SDK Test',
      transferDesignatedDate: transferDate,
      transferDateHolidayCode: '1',
      transfers: [
        {
          itemId: '1',
          transferAmount: '100',
          beneficiaryBankCode: '0310', // GMO Aozora (test)
          beneficiaryBankName: 'GMOあおぞら',
          beneficiaryBranchCode: '001',
          beneficiaryBranchName: '本店',
          accountTypeCode: '1',
          accountNumber: '0013666', // same account or a test one you control
          beneficiaryName: 'ﾃｽﾄ ﾕｰｻﾞｰ',
        },
      ],
      applyComment: 'SDK検証', // must be ≤20 chars (Japanese counts as 1)
    });

    console.log('\nTransfer request submitted successfully!');
    console.log('applyNo:', transferRes.applyNo);
    console.log('resultCode:', transferRes.resultCode, '(2 = pending approval)');
    console.log('\nNext steps:');
    console.log('1. Go to Sunabar service site (法人ログイン)');
    console.log('2. Check notifications or "お知らせ" for the transfer request');
    console.log('3. Approve using your transaction password (or cancel)');
    console.log('4. Then run with --with-transfer-status to check the result');
  } catch (e) {
    if (e instanceof GmoAozoraValidationError) {
      console.error('Transfer request validation failed. Issues:');
      console.error(JSON.stringify(e.issues, null, 2));
    } else if (e instanceof GmoAozoraApiError) {
      console.error(`Transfer request failed: ${e.code}: ${e.message}`);
    } else {
      console.error('Transfer request failed:', String(e));
    }
  }
}

const estimateFee = process.argv.includes('--estimate-fee');
if (estimateFee) {
  console.log('\nEstimating transfer fee (read-only, no actual transfer)...');
  try {
    const fee = await readonlyClient.corporation.transfers.estimateFee({
      accountId: readonlyAccountId,
      transferDesignatedDate: '2026-05-07', // future business day
      transferDateHolidayCode: '1',
      transfers: [
        {
          itemId: '1',
          transferAmount: '10000',
          beneficiaryBankCode: '0310', // GMO Aozora
          beneficiaryBankName: 'GMOあおぞら',
          beneficiaryBranchCode: '001',
          beneficiaryBranchName: '本店',
          accountTypeCode: '1',
          accountNumber: '1234567',
          beneficiaryName: 'ﾃｽﾄ ｼﾞｭｼｮﾆﾝ',
        },
      ],
    });
    console.log('Fee estimate response keys:', Object.keys(fee));
    console.log('Total fee:', fee.totalFee);
    console.log('Detail count:', fee.transferFeeDetails.length);
  } catch (e) {
    const message = e instanceof GmoAozoraApiError ? `${e.code}: ${e.message}` : String(e);
    console.error('Fee estimation failed (may require specific test data in Sunabar):', message);
  }
}
