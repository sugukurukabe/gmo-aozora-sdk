import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const manifestPath = join(rootDir, 'docs/snippets/manifest.json');

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertManifestEntry(value, index) {
  if (!isRecord(value)) {
    throw new Error(`docs snippet manifest entry ${index} must be an object`);
  }

  const { sourcePath, snippetPath, description } = value;
  if (typeof sourcePath !== 'string' || sourcePath.length === 0) {
    throw new Error(`docs snippet manifest entry ${index} is missing sourcePath`);
  }
  if (typeof snippetPath !== 'string' || snippetPath.length === 0) {
    throw new Error(`docs snippet manifest entry ${index} is missing snippetPath`);
  }
  if (typeof description !== 'string' || description.length === 0) {
    throw new Error(`docs snippet manifest entry ${index} is missing description`);
  }

  return { sourcePath, snippetPath, description };
}

async function readWorkspaceFile(pathFromRoot) {
  return readFile(join(rootDir, pathFromRoot), 'utf8');
}

const manifestRaw = await readFile(manifestPath, 'utf8');
const parsedManifest = JSON.parse(manifestRaw);

if (!Array.isArray(parsedManifest)) {
  throw new Error('docs snippet manifest must be an array');
}

const entries = parsedManifest.map(assertManifestEntry);
const sourcePaths = new Set();
const snippetPaths = new Set();

for (const entry of entries) {
  if (sourcePaths.has(entry.sourcePath) && entry.sourcePath !== 'README.ja.md') {
    throw new Error(`duplicate sourcePath in docs snippet manifest: ${entry.sourcePath}`);
  }
  sourcePaths.add(entry.sourcePath);
  snippetPaths.add(entry.snippetPath);

  const source = await readWorkspaceFile(entry.sourcePath);
  const snippet = await readWorkspaceFile(entry.snippetPath);

  if (!/```(?:typescript|ts)\b/.test(source)) {
    throw new Error(`${entry.sourcePath} has no TypeScript code fence to mirror`);
  }
  if (snippet.trim().length === 0) {
    throw new Error(`${entry.snippetPath} is empty`);
  }
}

const snippetsTsconfig = await readWorkspaceFile('docs/snippets/tsconfig.json');
for (const snippetPath of snippetPaths) {
  const normalized = relative(
    join(rootDir, 'docs/snippets'),
    join(rootDir, snippetPath),
  ).replaceAll('\\', '/');
  if (normalized.startsWith('../')) {
    throw new Error(`${snippetPath} must live under docs/snippets`);
  }
}

if (!snippetsTsconfig.includes('"./**/*.ts"')) {
  throw new Error('docs/snippets/tsconfig.json must include all snippet .ts files');
}

console.log(
  `docs snippet manifest passed (${entries.length} sources, ${snippetPaths.size} snippets)`,
);
