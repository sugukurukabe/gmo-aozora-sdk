import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const manifestPath = join(rootDir, 'scripts/public-api-manifest.json');

function assertManifestEntry(value, index) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`public API manifest entry ${index} must be an object`);
  }

  const { name, distDir, exports } = value;
  if (typeof name !== 'string' || name.length === 0) {
    throw new Error(`public API manifest entry ${index} is missing name`);
  }
  if (typeof distDir !== 'string' || distDir.length === 0) {
    throw new Error(`public API manifest entry ${index} is missing distDir`);
  }
  if (!Array.isArray(exports) || exports.some((exportName) => typeof exportName !== 'string')) {
    throw new Error(`public API manifest entry ${index} must list string exports`);
  }

  return { name, distDir, exports };
}

function assertExports(packageName, moduleRecord, expectedExports, format) {
  const missing = expectedExports.filter((exportName) => !(exportName in moduleRecord));
  if (missing.length > 0) {
    throw new Error(`${packageName} ${format} build is missing exports: ${missing.join(', ')}`);
  }
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8')).map(assertManifestEntry);

for (const packageInfo of manifest) {
  const cjsPath = join(rootDir, packageInfo.distDir, 'index.js');
  const esmUrl = pathToFileURL(join(rootDir, packageInfo.distDir, 'index.mjs')).href;

  const cjsModule = require(cjsPath);
  assertExports(packageInfo.name, cjsModule, packageInfo.exports, 'CJS');

  const esmModule = await import(esmUrl);
  assertExports(packageInfo.name, esmModule, packageInfo.exports, 'ESM');
}

console.log(`public API manifest passed (${manifest.length} packages)`);
