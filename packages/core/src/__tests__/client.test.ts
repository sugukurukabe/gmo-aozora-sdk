import { describe, it, expect } from 'vitest';
import { GmoAozoraClient } from '../client.js';
import { PRIVATE_SCOPES } from '../auth/index.js';
import { InMemoryTokenStorage } from '../storage/index.js';

function makeClient() {
  return new GmoAozoraClient({
    environment: 'sunabar',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'https://example.com/callback',
    defaultScopes: [PRIVATE_SCOPES.ACCOUNT, PRIVATE_SCOPES.OFFLINE_ACCESS],
  });
}

describe('GmoAozoraClient', () => {
  it('exposes the environment', () => {
    const client = makeClient();
    expect(client.environment).toBe('sunabar');
  });

  it('exposes the API base URL', () => {
    const client = makeClient();
    expect(client.apiBaseUrl).toBeTruthy();
    expect(client.apiBaseUrl).toContain('sandbox');
  });

  it('accepts custom tokenStorage', () => {
    const storage = new InMemoryTokenStorage();
    const client = new GmoAozoraClient({
      environment: 'sunabar',
      clientId: 'id',
      clientSecret: 'secret',
      redirectUri: 'https://example.com/cb',
      tokenStorage: storage,
    });
    expect(client).toBeTruthy();
  });

  it('buildAuthorizationUrl returns a URL and session', () => {
    const client = makeClient();
    const { url, session } = client.buildAuthorizationUrl();
    expect(url).toContain('authorization');
    expect(session.state).toBeTruthy();
    expect(session.codeVerifier).toBeTruthy();
  });
});

describe('GmoAozoraClient.useUser', () => {
  it('returns a GmoAozoraUserClient', () => {
    const client = makeClient();
    const userClient = client.useUser('user-123');
    expect(userClient).toBeTruthy();
  });

  it('user client exposes correct environment', () => {
    const client = makeClient();
    const userClient = client.useUser('user-1');
    expect(userClient.environment).toBe('sunabar');
  });

  it('user client exposes apiBaseUrl', () => {
    const client = makeClient();
    const userClient = client.useUser('user-1');
    expect(userClient.apiBaseUrl).toContain('sandbox');
  });
});

describe('GmoAozoraClient environments', () => {
  it('sunabar points to sandbox URL', () => {
    const c = new GmoAozoraClient({
      environment: 'sunabar',
      clientId: 'id',
      clientSecret: 'secret',
      redirectUri: 'https://x.com/cb',
    });
    expect(c.apiBaseUrl).toContain('sandbox');
  });

  it('production does NOT point to sandbox', () => {
    const c = new GmoAozoraClient({
      environment: 'production',
      clientId: 'id',
      clientSecret: 'secret',
      redirectUri: 'https://x.com/cb',
    });
    expect(c.apiBaseUrl).not.toContain('sandbox');
  });
});
