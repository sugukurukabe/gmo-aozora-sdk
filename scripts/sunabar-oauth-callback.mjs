#!/usr/bin/env node
/**
 * sunabar-oauth-callback.mjs
 *
 * Interactive OAuth 2.0 PKCE helper for Sunabar validation.
 * Starts a local HTTP server on port 8080, opens the authorization URL,
 * and exchanges the returned code for an access token.
 *
 * Usage:
 *   GMO_CLIENT_ID=<id> GMO_CLIENT_SECRET=<secret> node scripts/sunabar-oauth-callback.mjs
 *
 * On success, prints GMO_ACCESS_TOKEN to stdout.
 * NEVER stores tokens to disk. The token is printed once and discarded.
 *
 * This script uses only Node.js built-ins — no SDK import needed.
 */

import { createServer } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const CLIENT_ID = process.env['GMO_CLIENT_ID'];
const CLIENT_SECRET = process.env['GMO_CLIENT_SECRET'];
const REDIRECT_URI = process.env['GMO_REDIRECT_URI'] ?? 'http://localhost:8080/callback';
const PORT = Number(new URL(REDIRECT_URI).port || 8080);

const SUNABAR_AUTH_URL =
  'https://api.sunabar.gmo-aozora.com/auth/v1/authorization';
const SUNABAR_TOKEN_URL =
  'https://api.sunabar.gmo-aozora.com/auth/v1/token';

const SCOPES = ['private:account', 'private:offline_access'];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: GMO_CLIENT_ID and GMO_CLIENT_SECRET are required.');
  console.error(
    'Usage: GMO_CLIENT_ID=<id> GMO_CLIENT_SECRET=<secret> node scripts/sunabar-oauth-callback.mjs',
  );
  process.exit(1);
}

console.log('=== Sunabar OAuth PKCE Helper ===');
console.log('Redirect URI that will be used:', REDIRECT_URI);
console.log('IMPORTANT: This MUST exactly match the redirect URI registered in the Sunabar developer portal.');
console.log('If you see "Forbidden", double-check the redirect URI in the portal and set GMO_REDIRECT_URI accordingly.\n');

// --- PKCE S256 ---
const verifier = randomBytes(48)
  .toString('base64url')
  .slice(0, 128);
const challenge = createHash('sha256').update(verifier).digest('base64url');
const state = randomBytes(32).toString('base64url');

const authUrl = new URL(SUNABAR_AUTH_URL);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('scope', SCOPES.join(' '));
authUrl.searchParams.set('state', state);
authUrl.searchParams.set('code_challenge', challenge);
authUrl.searchParams.set('code_challenge_method', 'S256');

console.log('\n=== Sunabar OAuth 2.0 PKCE Helper ===');
console.log('\nOpen this URL in your browser to authorize:');
console.log('\n' + authUrl.toString() + '\n');
console.log(`Waiting for callback on ${REDIRECT_URI} ...`);

// --- Callback server ---
let resolveCode;
const codePromise = new Promise((res) => {
  resolveCode = res;
});

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  if (url.pathname !== '/callback') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const returnedState = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(`<h1>Authorization error: ${error}</h1><p>You may close this tab.</p>`);
    resolveCode({ ok: false, error });
    return;
  }

  if (returnedState !== state) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end('<h1>State mismatch — possible CSRF</h1>');
    resolveCode({ ok: false, error: 'state_mismatch' });
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Authorization successful!</h1><p>You may close this tab and return to the terminal.</p>');
  resolveCode({ ok: true, code });
});

server.listen(PORT);

const result = await codePromise;
server.close();

if (!result.ok) {
  console.error('Authorization failed:', result.error);
  process.exit(1);
}

const { code } = result;
console.log('\nAuthorization code received. Exchanging for token...');

// --- Token exchange ---
const tokenBody = new URLSearchParams({
  grant_type: 'authorization_code',
  code: code,
  redirect_uri: REDIRECT_URI,
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  code_verifier: verifier,
});

const tokenRes = await fetch(SUNABAR_TOKEN_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: tokenBody.toString(),
});

if (!tokenRes.ok) {
  const body = await tokenRes.text();
  console.error('\n=== Token exchange failed ===');
  console.error('Status:', tokenRes.status);
  console.error('Response body:', body);
  console.error('\nSent redirect_uri:', REDIRECT_URI);
  console.error('This redirect_uri MUST exactly match what you registered in the Sunabar developer portal.');
  console.error('Common causes: trailing slash mismatch, http vs https, port difference, or path difference.');
  process.exit(1);
}

const tokens = await tokenRes.json();
const expiresAt = Date.now() + (tokens.expires_in ?? 3600) * 1000;

console.log('\n=== Token obtained ===');
console.log('Scope:', tokens.scope);
console.log('Expires at:', new Date(expiresAt).toISOString());
console.log('\n--- Run this export, then use pnpm sunabar:readonly ---');
const refreshPart = tokens.refresh_token
  ? ` GMO_REFRESH_TOKEN="${tokens.refresh_token}"`
  : '';
console.log(
  `export GMO_ACCESS_TOKEN="${tokens.access_token}"${refreshPart} GMO_CLIENT_ID="${CLIENT_ID}" GMO_CLIENT_SECRET="${CLIENT_SECRET}"`,
);
console.log('\n(Token is NOT saved to disk — copy it now if needed.)');
if (!tokens.refresh_token) {
  console.log('(No refresh_token returned — offline_access scope may be missing.)');
}

// Small delay so the user can read the output
await delay(500);
