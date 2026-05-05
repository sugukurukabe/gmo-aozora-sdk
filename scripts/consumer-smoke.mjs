import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

const packages = ['packages/zengin-format', 'packages/webhook', 'packages/core'];

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: true,
      stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      cwd: options.cwd,
    });

    let stdout = '';
    let stderr = '';

    if (options.capture) {
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });
    }

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(`${command} ${args.join(' ')} failed with exit code ${code}`, {
          cause: stderr,
        }),
      );
    });
  });
}

function parsePackTarball(stdout, packagePath) {
  const parsed = JSON.parse(stdout);
  if (!Array.isArray(parsed) || parsed.length !== 1 || typeof parsed[0].filename !== 'string') {
    throw new Error(`unexpected npm pack JSON output for ${packagePath}`);
  }
  return parsed[0].filename;
}

const tempDir = await mkdtemp(join(tmpdir(), 'gmo-aozora-sdk-consumer-'));
let shouldCleanup = false;

try {
  const tarballs = [];

  for (const packagePath of packages) {
    const { stdout } = await run('npm', ['pack', '--json', '--pack-destination', tempDir], {
      cwd: join(rootDir, packagePath),
      capture: true,
    });
    tarballs.push(join(tempDir, parsePackTarball(stdout, packagePath)));
  }

  await writeFile(
    join(tempDir, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }, null, 2),
  );

  await run(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', ...tarballs],
    { cwd: tempDir },
  );

  await writeFile(
    join(tempDir, 'smoke-esm.mjs'),
    `import { createHmac } from 'node:crypto';
import { GmoAozoraClient, parseAmount } from '@sugukuru/gmo-aozora-sdk';
import { buildZenginFile } from '@sugukuru/zengin-format';
import { verifyAndParseWebhookEvent, verifyWebhookSignature } from '@sugukuru/gmo-aozora-webhook';

const client = new GmoAozoraClient({
  environment: 'sunabar',
  clientId: 'consumer-smoke-client',
  clientSecret: 'consumer-smoke-secret',
  redirectUri: 'http://localhost/callback',
});
const { session } = client.buildAuthorizationUrl();
if (session.codeVerifier.length < 43) throw new Error('PKCE verifier too short');
if (parseAmount('123') !== 123n) throw new Error('parseAmount failed');

const zengin = buildZenginFile({
  shorui: '11',
  transferDate: '0525',
  remitter: {
    code: '0000000001',
    name: 'ｽｸﾞｸﾙ',
    bankCode: '0310',
    bankName: 'ｼﾞｰｴﾑｵｰ',
    branchCode: '001',
    branchName: 'ﾎﾝﾃﾝ',
    accountTypeCode: '1',
    accountNumber: '1234567',
  },
  records: [{
    bankCode: '0001',
    bankName: 'ﾐｽﾞﾎ',
    branchCode: '001',
    branchName: 'ﾎﾝﾃﾝ',
    accountTypeCode: '1',
    accountNumber: '7654321',
    beneficiaryName: 'ﾔﾏﾀﾞ',
    amount: 1000n,
  }],
});
if (zengin.byteLength !== 480) throw new Error('unexpected Zengin byte length');

const rawBody = Buffer.from(JSON.stringify({
  notificationId: 'notice-1',
  eventType: 'va-deposit-transaction',
  eventTime: '2026-05-05T12:00:00+09:00',
  data: {
    virtualAccountId: 'va-1',
    amount: '1000',
    transactionId: 'txn-1',
  },
}));
const secret = 'consumer-smoke-webhook-secret';
const signature = createHmac('sha256', secret).update(rawBody).digest('base64');
if (!verifyWebhookSignature({ rawBody, signature, secret })) {
  throw new Error('webhook signature failed');
}
verifyAndParseWebhookEvent({ rawBody, signature, secret });
`,
  );

  await writeFile(
    join(tempDir, 'smoke-cjs.cjs'),
    `const { GmoAozoraClient, formatAmount } = require('@sugukuru/gmo-aozora-sdk');
const { toHalfWidthKana } = require('@sugukuru/zengin-format');
const { parseWebhookEvent } = require('@sugukuru/gmo-aozora-webhook');

if (typeof GmoAozoraClient !== 'function') throw new Error('missing CJS GmoAozoraClient');
if (formatAmount(123n) !== '123') throw new Error('formatAmount failed');
if (toHalfWidthKana('カタカナ') !== 'ｶﾀｶﾅ') throw new Error('kana conversion failed');
if (typeof parseWebhookEvent !== 'function') throw new Error('missing CJS parseWebhookEvent');
`,
  );

  await writeFile(
    join(tempDir, 'smoke-types.ts'),
    `import {
  GmoAozoraClient,
  PRIVATE_SCOPES,
  type TransferCreateInput,
} from '@sugukuru/gmo-aozora-sdk';
import { buildZenginFile, type ZenginFileInput } from '@sugukuru/zengin-format';
import {
  verifyAndParseWebhookEvent,
  type WebhookEvent,
} from '@sugukuru/gmo-aozora-webhook';

const client = new GmoAozoraClient({
  environment: 'sunabar',
  clientId: 'typed-client',
  clientSecret: 'typed-secret',
  redirectUri: 'http://localhost/callback',
  defaultScopes: [PRIVATE_SCOPES.ACCOUNT],
});
client.useUser('typed-user');

const transfer: TransferCreateInput = {
  accountId: '123456789012',
  transferDesignatedDate: '2026-05-25',
  transfers: [{
    transferAmount: '1000',
    beneficiaryBankCode: '0001',
    beneficiaryBranchCode: '001',
    accountTypeCode: '1',
    accountNumber: '1234567',
    beneficiaryName: 'YAMADA TARO',
  }],
};
void transfer;

const input: ZenginFileInput = {
  shorui: '11',
  transferDate: '0525',
  remitter: {
    code: '0000000001',
    name: 'ｽｸﾞｸﾙ',
    bankCode: '0310',
    bankName: 'ｼﾞｰｴﾑｵｰ',
    branchCode: '001',
    branchName: 'ﾎﾝﾃﾝ',
    accountTypeCode: '1',
    accountNumber: '1234567',
  },
  records: [],
};
buildZenginFile(input);

const event: WebhookEvent = verifyAndParseWebhookEvent({
  rawBody: Buffer.from('{}'),
  signature: 'invalid',
  secret: 'typed-secret',
});
void event;
`,
  );

  await writeFile(
    join(tempDir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
          exactOptionalPropertyTypes: true,
          noUncheckedIndexedAccess: true,
          noEmit: true,
          types: ['node'],
          typeRoots: [join(rootDir, 'node_modules/@types')],
          skipLibCheck: true,
        },
        include: ['smoke-types.ts'],
      },
      null,
      2,
    ),
  );

  await run('node', ['smoke-esm.mjs'], { cwd: tempDir });
  await run('node', ['smoke-cjs.cjs'], { cwd: tempDir });
  await run(
    process.execPath,
    [join(rootDir, 'node_modules/typescript/bin/tsc'), '--project', 'tsconfig.json'],
    {
      cwd: tempDir,
    },
  );

  shouldCleanup = true;
  console.log('consumer smoke test passed');
} finally {
  if (shouldCleanup) {
    await rm(tempDir, { recursive: true, force: true });
  } else {
    console.error(`consumer smoke temp directory retained for debugging: ${tempDir}`);
  }
}
