import { access, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

const packages = [
  {
    path: 'packages/core',
    name: '@sugukuru/gmo-aozora-sdk',
    requiredKeywords: ['gmo-aozora', 'typescript', 'fintech'],
    requiresZod: true,
  },
  {
    path: 'packages/zengin-format',
    name: '@sugukuru/zengin-format',
    requiredKeywords: ['zengin', 'japanese-bank', 'payroll'],
    requiresZod: true,
  },
  {
    path: 'packages/webhook',
    name: '@sugukuru/gmo-aozora-webhook',
    requiredKeywords: ['webhook', 'hmac', 'typescript'],
    requiresZod: true,
    optionalPeerDependencies: ['express'],
  },
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function pathExists(pathFromRoot) {
  try {
    await access(join(rootDir, pathFromRoot));
    return true;
  } catch {
    return false;
  }
}

async function readJson(pathFromRoot) {
  return JSON.parse(await readFile(join(rootDir, pathFromRoot), 'utf8'));
}

for (const packageInfo of packages) {
  const packageJsonPath = `${packageInfo.path}/package.json`;
  const packageJson = await readJson(packageJsonPath);

  assert(packageJson.name === packageInfo.name, `${packageJsonPath}: unexpected package name`);
  assert(
    /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(packageJson.version),
    `${packageJsonPath}: invalid semver version`,
  );
  assert(packageJson.license === 'Apache-2.0', `${packageJsonPath}: license must be Apache-2.0`);
  assert(packageJson.author === 'Sugukuru Co., Ltd.', `${packageJsonPath}: author mismatch`);
  assert(packageJson.sideEffects === false, `${packageJsonPath}: sideEffects must be false`);
  assert(
    packageJson.engines?.node === '>=20.0.0',
    `${packageJsonPath}: Node engine must be >=20.0.0`,
  );

  assert(packageJson.main === './dist/index.js', `${packageJsonPath}: main must point to CJS dist`);
  assert(
    packageJson.module === './dist/index.mjs',
    `${packageJsonPath}: module must point to ESM dist`,
  );
  assert(
    packageJson.types === './dist/index.d.ts',
    `${packageJsonPath}: types must point to dist declarations`,
  );

  const exportKeys = Object.keys(packageJson.exports?.['.'] ?? {});
  assert(
    exportKeys.join(',') === 'types,import,require',
    `${packageJsonPath}: exports["."] must be ordered as types, import, require`,
  );

  for (const fileEntry of ['dist', 'README.md', 'CHANGELOG.md', 'LICENSE']) {
    assert(
      packageJson.files?.includes(fileEntry),
      `${packageJsonPath}: files must include ${fileEntry}`,
    );
    assert(
      await pathExists(`${packageInfo.path}/${fileEntry}`),
      `${packageJsonPath}: missing ${fileEntry}`,
    );
  }

  assert(
    await pathExists('LICENSE'),
    `${packageJsonPath}: root LICENSE is required for npm packages`,
  );
  assert(
    typeof packageJson.repository?.url === 'string',
    `${packageJsonPath}: repository.url is required`,
  );
  assert(
    /^git\+https:\/\/github\.com\/[^/]+\/[^/]+\.git$/.test(packageJson.repository.url),
    `${packageJsonPath}: repository.url must be of the form git+https://github.com/<owner>/<repo>.git`,
  );
  assert(
    packageJson.repository?.directory === packageInfo.path.replaceAll('\\', '/'),
    `${packageJsonPath}: repository.directory mismatch`,
  );
  assert(typeof packageJson.homepage === 'string', `${packageJsonPath}: homepage is required`);
  assert(
    packageJson.homepage.startsWith('https://github.com/'),
    `${packageJsonPath}: homepage must be a github.com URL`,
  );
  assert(typeof packageJson.bugs?.url === 'string', `${packageJsonPath}: bugs.url is required`);

  const ownerFromRepo = packageJson.repository.url.match(/github\.com\/([^/]+)\//)?.[1];
  assert(
    packageJson.homepage.includes(`/${ownerFromRepo}/`) &&
      packageJson.bugs.url.includes(`/${ownerFromRepo}/`),
    `${packageJsonPath}: repository, homepage, and bugs URLs must use the same GitHub owner`,
  );

  for (const keyword of packageInfo.requiredKeywords) {
    assert(
      packageJson.keywords?.includes(keyword),
      `${packageJsonPath}: missing keyword ${keyword}`,
    );
  }

  if (packageInfo.requiresZod) {
    assert(
      packageJson.dependencies?.zod === '^4.4.3',
      `${packageJsonPath}: zod must be a runtime dependency`,
    );
  }

  for (const peerName of packageInfo.optionalPeerDependencies ?? []) {
    assert(
      packageJson.peerDependencies?.[peerName],
      `${packageJsonPath}: ${peerName} must be a peer dependency`,
    );
    assert(
      packageJson.peerDependenciesMeta?.[peerName]?.optional === true,
      `${packageJsonPath}: ${peerName} peer dependency must be optional`,
    );
    assert(
      packageJson.dependencies?.[peerName] === undefined,
      `${packageJsonPath}: ${peerName} must not be a hard runtime dependency`,
    );
  }
}

console.log(`package metadata check passed (${packages.length} packages)`);
