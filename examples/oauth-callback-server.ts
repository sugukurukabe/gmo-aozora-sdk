/**
 * oauth-callback-server.ts — Complete OAuth 2.0 PKCE login flow with Express.
 *
 * This example shows the full browser-based login flow:
 *   1. Visit http://localhost:8080/login  → redirects to GMO authorization page
 *   2. Log in to Sunabar in the browser
 *   3. Browser returns to http://localhost:8080/callback
 *   4. Server exchanges the code for tokens
 *   5. Fetches account list and balance as proof
 *
 * Environment variables required:
 *   GMO_CLIENT_ID      — OAuth client ID from the developer portal
 *   GMO_CLIENT_SECRET  — OAuth client secret
 *   GMO_ACCOUNT_ID     — Account ID to fetch balance for
 *   PORT               — (optional) server port, defaults to 8080
 *
 * Redirect URI to register in the portal: http://localhost:8080/callback
 *
 * Run:
 *   GMO_CLIENT_ID=xxx GMO_CLIENT_SECRET=yyy GMO_ACCOUNT_ID=zzz \
 *     pnpm exec tsx examples/oauth-callback-server.ts
 *
 * Then open http://localhost:8080/login in your browser.
 */
import express from 'express';
import {
  GmoAozoraClient,
  PRIVATE_SCOPES,
  parseAmount,
  GmoAozoraError,
} from '@sugukuru/gmo-aozora-sdk';
import type { PkceSession } from '@sugukuru/gmo-aozora-sdk';

const PORT = Number(process.env['PORT'] ?? 8080);
const CLIENT_ID = process.env['GMO_CLIENT_ID'];
const CLIENT_SECRET = process.env['GMO_CLIENT_SECRET'];
const ACCOUNT_ID = process.env['GMO_ACCOUNT_ID'];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('GMO_CLIENT_ID and GMO_CLIENT_SECRET are required.');
  process.exit(1);
}

const REDIRECT_URI = `http://localhost:${PORT}/callback`;

// Shared client (stateless — tokens are in InMemoryTokenStorage by default)
const gmo = new GmoAozoraClient({
  environment: 'sunabar',
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  redirectUri: REDIRECT_URI,
  defaultScopes: [PRIVATE_SCOPES.ACCOUNT, PRIVATE_SCOPES.OFFLINE_ACCESS],
});

// In a real app, store per-request session in Redis or a signed cookie.
// For this single-user demo we use a module-level variable.
let pendingSession: PkceSession | null = null;
const USER_ID = 'demo-user';

const app = express();

// -----------------------------------------------------------------------
// Step 1: Start login → redirect to GMO authorization page
// -----------------------------------------------------------------------
app.get('/login', (_req, res) => {
  const { url, session } = gmo.buildAuthorizationUrl();
  pendingSession = session; // save PKCE session for the callback
  res.redirect(url);
});

// -----------------------------------------------------------------------
// Step 2: Receive authorization code from GMO, exchange for tokens
// -----------------------------------------------------------------------
app.get('/callback', async (req, res) => {
  const code = req.query['code'];
  const state = req.query['state'];

  if (typeof code !== 'string' || typeof state !== 'string') {
    res.status(400).send('Missing code or state in callback.');
    return;
  }

  if (!pendingSession) {
    res.status(400).send('No pending OAuth session. Visit /login first.');
    return;
  }

  const user = gmo.useUser(USER_ID);

  try {
    await user.exchangeCode({ code, state, session: pendingSession });
    pendingSession = null; // consumed — clear it
  } catch (e) {
    const message = e instanceof GmoAozoraError ? e.message : String(e);
    res.status(400).send(`Token exchange failed: ${message}`);
    return;
  }

  // -----------------------------------------------------------------------
  // Step 3: Use the API
  // -----------------------------------------------------------------------
  try {
    const accounts = await user.corporation.accounts.list();

    const accountId = ACCOUNT_ID ?? accounts[0]?.accountId;
    if (!accountId) {
      res.status(200).send('<pre>Logged in! No account ID available for balance check.</pre>');
      return;
    }

    const balance = await user.corporation.balances.get(accountId);
    const book = parseAmount(balance?.bookBalance ?? '0');
    const available = parseAmount(balance?.availableBalance ?? '0');

    res.status(200).send(
      `<pre>
=== Sunabar OAuth demo — login successful! ===

Account count : ${accounts.length}
Account ID    : ${accountId}
Book balance  : ¥${book.toLocaleString()}
Available     : ¥${available.toLocaleString()}

Visit /me to call the API again (token auto-refreshes).
</pre>`,
    );
  } catch (e) {
    const message = e instanceof GmoAozoraError ? e.message : String(e);
    res.status(500).send(`API call failed after login: ${message}`);
  }
});

// -----------------------------------------------------------------------
// Step 4: Subsequent requests — token is already stored, auto-refreshed
// -----------------------------------------------------------------------
app.get('/me', async (_req, res) => {
  const accountId = ACCOUNT_ID;
  if (!accountId) {
    res.status(400).send('Set GMO_ACCOUNT_ID to use /me endpoint.');
    return;
  }

  const user = gmo.useUser(USER_ID);
  try {
    const balance = await user.corporation.balances.get(accountId);
    const book = parseAmount(balance?.bookBalance ?? '0');
    res.json({ accountId, bookBalance: book.toString() });
  } catch (e) {
    const message = e instanceof GmoAozoraError ? e.message : String(e);
    res.status(401).json({ error: message });
  }
});

app.get('/', (_req, res) => {
  res.send(`
    <h1>GMO Aozora SDK — OAuth demo</h1>
    <ul>
      <li><a href="/login">Start OAuth login</a></li>
      <li><a href="/me">Get balance (after login)</a></li>
    </ul>
  `);
});

app.listen(PORT, () => {
  console.log(`\nOAuth callback server running at http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT}/login to start the OAuth flow.\n`);
  console.log(`Redirect URI registered in developer portal must be: ${REDIRECT_URI}`);
});
