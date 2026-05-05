import { describe, it, expect, vi, afterEach } from 'vitest';
import { OAuthClient, PRIVATE_SCOPES, getApiBaseUrl } from '../auth/index.js';
import type { GmoEnvironment } from '../auth/index.js';
import { InMemoryTokenStorage } from '../storage/index.js';
import { GmoAozoraAuthError, GmoAozoraStateMismatchError } from '../errors/index.js';

afterEach(() => {
  vi.restoreAllMocks();
});

function makeOAuthClient(env: GmoEnvironment = 'sunabar') {
  return new OAuthClient(
    {
      environment: env,
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'https://example.com/callback',
      defaultScopes: [PRIVATE_SCOPES.ACCOUNT, PRIVATE_SCOPES.OFFLINE_ACCESS],
    },
    new InMemoryTokenStorage(),
  );
}

describe('PRIVATE_SCOPES', () => {
  it('has correct scope values', () => {
    expect(PRIVATE_SCOPES.ACCOUNT).toBe('private:account');
    expect(PRIVATE_SCOPES.TRANSFER).toBe('private:transfer');
    expect(PRIVATE_SCOPES.OFFLINE_ACCESS).toBe('private:offline_access');
  });
});

describe('getApiBaseUrl', () => {
  it('returns sunabar URL', () => {
    const url = getApiBaseUrl('sunabar');
    expect(url).toContain('sandbox');
  });

  it('returns staging URL', () => {
    const url = getApiBaseUrl('staging');
    expect(url).toContain('stg');
  });

  it('returns production URL', () => {
    const url = getApiBaseUrl('production');
    expect(url).toContain('api.gmo-aozora.com');
    expect(url).not.toContain('sandbox');
    expect(url).not.toContain('stg');
  });
});

describe('OAuthClient.buildAuthorizationUrl', () => {
  it('returns a URL and a PKCE session', () => {
    const client = makeOAuthClient();
    const { url, session } = client.buildAuthorizationUrl();
    expect(url).toContain('response_type=code');
    expect(url).toContain('code_challenge_method=S256');
    expect(url).toContain('code_challenge=');
    expect(url).toContain('state=');
    expect(session.codeVerifier).toBeTruthy();
    expect(session.state).toBeTruthy();
  });

  it('includes client_id in the URL', () => {
    const client = makeOAuthClient();
    const { url } = client.buildAuthorizationUrl();
    expect(url).toContain('client_id=test-client-id');
  });

  it('includes redirect_uri in the URL', () => {
    const client = makeOAuthClient();
    const { url } = client.buildAuthorizationUrl();
    expect(url).toContain('redirect_uri=');
    expect(decodeURIComponent(url)).toContain('https://example.com/callback');
  });

  it('includes default scopes when none specified', () => {
    const client = makeOAuthClient();
    const { url, session } = client.buildAuthorizationUrl();
    expect(session.scopes).toContain(PRIVATE_SCOPES.ACCOUNT);
    expect(session.scopes).toContain(PRIVATE_SCOPES.OFFLINE_ACCESS);
    expect(url).toContain('scope=');
  });

  it('accepts custom scopes', () => {
    const client = makeOAuthClient();
    const { session } = client.buildAuthorizationUrl([PRIVATE_SCOPES.TRANSFER]);
    expect(session.scopes).toContain(PRIVATE_SCOPES.TRANSFER);
    expect(session.scopes).not.toContain(PRIVATE_SCOPES.ACCOUNT);
  });

  it('uses sunabar endpoint for sunabar environment', () => {
    const client = makeOAuthClient('sunabar');
    const { url } = client.buildAuthorizationUrl();
    expect(url).toContain('sandbox');
  });

  it('generates unique sessions for each call', () => {
    const client = makeOAuthClient();
    const a = client.buildAuthorizationUrl();
    const b = client.buildAuthorizationUrl();
    expect(a.session.state).not.toBe(b.session.state);
    expect(a.session.codeVerifier).not.toBe(b.session.codeVerifier);
  });
});

describe('OAuthClient.exchangeCode — state mismatch', () => {
  it('throws GmoAozoraStateMismatchError when state does not match', async () => {
    const client = makeOAuthClient();
    const { session } = client.buildAuthorizationUrl();

    await expect(
      client.exchangeCode('user-1', {
        code: 'some-code',
        state: 'wrong-state',
        session,
      }),
    ).rejects.toBeInstanceOf(GmoAozoraStateMismatchError);
  });
});

describe('OAuthClient.getAccessToken — not authenticated', () => {
  it('throws GmoAozoraAuthError when user has no tokens', async () => {
    const client = makeOAuthClient();
    await expect(client.getAccessToken('user-nobody')).rejects.toBeInstanceOf(GmoAozoraAuthError);
  });
});

describe('OAuthClient.getAccessToken — proactive refresh', () => {
  it('calls token endpoint when expiresAt is within 60s', async () => {
    const storage = new InMemoryTokenStorage();
    const client = new OAuthClient(
      {
        environment: 'sunabar',
        clientId: 'cid',
        clientSecret: 'csec',
        redirectUri: 'https://example.com/cb',
      },
      storage,
    );
    await storage.save('u1', {
      accessToken: 'old-access',
      refreshToken: 'refresh-token',
      expiresAt: Date.now() + 30_000,
      tokenType: 'Bearer',
      scope: 'private:account',
    });

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: 'new-access',
          refresh_token: 'refresh-token',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'private:account',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const token = await client.getAccessToken('u1');
    expect(token).toBe('new-access');
    const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
    expect(url).toContain('/token');
  });
});

describe('OAuthClient.revokeTokens', () => {
  it('POSTs to revoke endpoint and clears storage', async () => {
    const storage = new InMemoryTokenStorage();
    const client = new OAuthClient(
      {
        environment: 'sunabar',
        clientId: 'cid',
        clientSecret: 'csec',
        redirectUri: 'https://example.com/cb',
      },
      storage,
    );
    await storage.save('u1', {
      accessToken: 'acc',
      refreshToken: 'ref',
      expiresAt: Date.now() + 3_600_000,
      tokenType: 'Bearer',
      scope: 'private:account',
    });

    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 200 }));

    await client.revokeTokens('u1');

    expect(await storage.load('u1')).toBeNull();
    const revokeUrl = vi.mocked(fetch).mock.calls[0]?.[0] as string;
    expect(revokeUrl).toContain('/tokens/revoke');
    const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    expect(init?.method).toBe('POST');
  });
});
