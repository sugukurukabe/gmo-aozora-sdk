import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

const packages = [
  {
    path: 'packages/core',
    requiredFiles: [
      'package.json',
      'README.md',
      'CHANGELOG.md',
      'LICENSE',
      'dist/index.js',
      'dist/index.mjs',
      'dist/index.d.ts',
      'dist/index.d.mts',
    ],
  },
  {
    path: 'packages/zengin-format',
    requiredFiles: [
      'package.json',
      'README.md',
      'CHANGELOG.md',
      'LICENSE',
      'dist/index.js',
      'dist/index.mjs',
      'dist/index.d.ts',
      'dist/index.d.mts',
    ],
  },
  {
    path: 'packages/webhook',
    requiredFiles: [
      'package.json',
      'README.md',
      'CHANGELOG.md',
      'LICENSE',
      'dist/index.js',
      'dist/index.mjs',
      'dist/index.d.ts',
      'dist/index.d.mts',
    ],
  },
];

const forbiddenFilePatterns = [
  /^src\//,
  /__tests__\//,
  /^coverage\//,
  /^tsconfig/,
  /^vitest\.config\.ts$/,
  /^tsup\.config\.ts$/,
  /\.env(?:\..*)?$/i,
  /\.tgz$/i,
];

function parsePackOutput(stdout, packagePath) {
  try {
    const parsed = JSON.parse(stdout);
    if (!Array.isArray(parsed) || parsed.length !== 1 || !Array.isArray(parsed[0].files)) {
      throw new Error('unexpected npm pack JSON structure');
    }
    return parsed[0].files.map((file) => file.path);
  } catch (e) {
    throw new Error(`failed to parse npm pack --dry-run --json output for ${packagePath}`, {
      cause: e,
    });
  }
}

function assertPackFiles(packagePath, filePaths, requiredFiles) {
  for (const requiredFile of requiredFiles) {
    if (!filePaths.includes(requiredFile)) {
      throw new Error(`${packagePath}: npm pack output is missing ${requiredFile}`);
    }
  }

  for (const filePath of filePaths) {
    const forbiddenPattern = forbiddenFilePatterns.find((pattern) => pattern.test(filePath));
    if (forbiddenPattern) {
      throw new Error(`${packagePath}: npm pack output includes forbidden file ${filePath}`);
    }
  }
}

async function runPackDryRun(packageInfo) {
  const cwd = join(rootDir, packageInfo.path);
  let stdout = '';

  await new Promise((resolve, reject) => {
    const child = spawn('npm', ['pack', '--dry-run', '--json'], {
      cwd,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`npm pack --dry-run failed in ${packageInfo.path} with exit code ${code}`));
    });
  });

  const filePaths = parsePackOutput(stdout, packageInfo.path);
  assertPackFiles(packageInfo.path, filePaths, packageInfo.requiredFiles);
  console.log(`${packageInfo.path}: pack dry-run passed (${filePaths.length} files)`);
}

for (const packageInfo of packages) {
  await runPackDryRun(packageInfo);
}
