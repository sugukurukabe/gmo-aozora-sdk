import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

const ignoredDirectories = new Set([
  '.git',
  '.pnpm-store',
  'coverage',
  'dist',
  'node_modules',
  '.turbo',
]);

const ignoredFiles = new Set(['pnpm-lock.yaml']);
const scannedExtensions = new Set([
  '.cjs',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
]);

const allowedMatches = [
  /your-[a-z-]+/i,
  /YOUR_[A-Z_]+/,
  /CODE_FROM_REDIRECT/,
  /DRY_RUN_[A-Z_]+/,
  /tok(?:en)?(?:-|_)?(?:123|user|default|test)?/i,
  /refresh-token/i,
  /refresh-tok/i,
  /test-client-secret/i,
  /super-secret/i,
  /csec/,
  /secret/,
  /^process\.env/,
  /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/,
  /\.\.\./,
  /<token>/i,
  /<id>/i,
];

const textSecretPatterns = [
  {
    name: 'assigned secret-looking value',
    pattern:
      /\b(?:GMO_CLIENT_SECRET|GMO_ACCESS_TOKEN|WEBHOOK_SECRET|clientSecret|accessToken|refreshToken)\b\s*[:=]\s*['"]?([A-Za-z0-9_\-./+=]{16,})['"]?/g,
  },
  {
    name: 'private key block',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/g,
  },
  {
    name: 'npm token',
    pattern: /npm_[A-Za-z0-9]{20,}/g,
  },
];

const forbiddenArtifactPatterns = [
  /\.env(?:\..*)?$/i,
  /\.tgz$/i,
  /credentials.*\.json$/i,
  /service-account.*\.json$/i,
];

function shouldIgnoreDirectory(pathFromRoot) {
  return pathFromRoot.split(/[\\/]/).some((part) => ignoredDirectories.has(part));
}

function isAllowedSecretValue(value) {
  return allowedMatches.some((pattern) => pattern.test(value));
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    const pathFromRoot = relative(rootDir, absolutePath);

    if (entry.isDirectory()) {
      if (!shouldIgnoreDirectory(pathFromRoot)) {
        files.push(...(await walk(absolutePath)));
      }
      continue;
    }

    if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files;
}

const findings = [];
const files = await walk(rootDir);

for (const absolutePath of files) {
  const pathFromRoot = relative(rootDir, absolutePath).split(sep).join('/');
  const fileName = pathFromRoot.split('/').at(-1) ?? pathFromRoot;

  if (ignoredFiles.has(fileName)) {
    continue;
  }

  for (const artifactPattern of forbiddenArtifactPatterns) {
    if (artifactPattern.test(fileName)) {
      findings.push(`${pathFromRoot}: forbidden release artifact or secret file`);
    }
  }

  const fileStat = await stat(absolutePath);
  if (fileStat.size > 1_000_000 || !scannedExtensions.has(extname(fileName))) {
    continue;
  }

  const content = await readFile(absolutePath, 'utf8');
  for (const { name, pattern } of textSecretPatterns) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern)) {
      const value = match[1] ?? match[0];
      if (!isAllowedSecretValue(value)) {
        findings.push(`${pathFromRoot}: possible ${name}`);
      }
    }
  }
}

if (findings.length > 0) {
  throw new Error(`security scan failed:\n${findings.map((finding) => `- ${finding}`).join('\n')}`);
}

console.log(`security scan passed (${files.length} files inspected for forbidden artifacts)`);
