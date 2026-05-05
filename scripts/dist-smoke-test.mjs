import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

const packages = [
  {
    name: '@sugukuru/gmo-aozora-sdk',
    distDir: 'packages/core/dist',
    expectedExports: ['GmoAozoraClient', 'parseAmount', 'TransferCreateInputSchema'],
  },
  {
    name: '@sugukuru/zengin-format',
    distDir: 'packages/zengin-format/dist',
    expectedExports: ['buildZenginFile', 'ZenginFileInputSchema', 'toHalfWidthKana'],
  },
  {
    name: '@sugukuru/gmo-aozora-webhook',
    distDir: 'packages/webhook/dist',
    expectedExports: [
      'verifyWebhookSignature',
      'verifyAndParseWebhookEvent',
      'parseWebhookEvent',
      'webhookMiddleware',
    ],
  },
];

function assertExports(packageName, moduleRecord, expectedExports, format) {
  const missing = expectedExports.filter((exportName) => !(exportName in moduleRecord));
  if (missing.length > 0) {
    throw new Error(`${packageName} ${format} build is missing exports: ${missing.join(', ')}`);
  }
}

for (const packageInfo of packages) {
  const cjsPath = join(rootDir, packageInfo.distDir, 'index.js');
  const esmUrl = pathToFileURL(join(rootDir, packageInfo.distDir, 'index.mjs')).href;

  const cjsModule = require(cjsPath);
  assertExports(packageInfo.name, cjsModule, packageInfo.expectedExports, 'CJS');

  const esmModule = await import(esmUrl);
  assertExports(packageInfo.name, esmModule, packageInfo.expectedExports, 'ESM');
}

console.log('dist smoke test passed');
