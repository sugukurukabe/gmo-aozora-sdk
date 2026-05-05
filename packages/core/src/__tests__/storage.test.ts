import { describe, it, expect } from 'vitest';
import { InMemoryTokenStorage } from '../storage/index.js';
import type { TokenSet } from '../storage/index.js';

function makeTokenSet(overrides?: Partial<TokenSet>): TokenSet {
  return {
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token-456',
    expiresAt: Date.now() + 3600_000,
    tokenType: 'Bearer',
    scope: 'private:account private:offline_access',
    ...overrides,
  };
}

describe('InMemoryTokenStorage', () => {
  it('saves and loads tokens for a user', async () => {
    const storage = new InMemoryTokenStorage();
    const tokens = makeTokenSet();
    await storage.save('user-1', tokens);
    const loaded = await storage.load('user-1');
    expect(loaded).toEqual(tokens);
  });

  it('returns null for unknown user', async () => {
    const storage = new InMemoryTokenStorage();
    const loaded = await storage.load('nonexistent');
    expect(loaded).toBeNull();
  });

  it('overwrites existing tokens on save', async () => {
    const storage = new InMemoryTokenStorage();
    await storage.save('user-1', makeTokenSet({ accessToken: 'old' }));
    await storage.save('user-1', makeTokenSet({ accessToken: 'new' }));
    const loaded = await storage.load('user-1');
    expect(loaded?.accessToken).toBe('new');
  });

  it('deletes tokens for a user', async () => {
    const storage = new InMemoryTokenStorage();
    await storage.save('user-1', makeTokenSet());
    await storage.delete('user-1');
    const loaded = await storage.load('user-1');
    expect(loaded).toBeNull();
  });

  it('delete is idempotent for unknown user', async () => {
    const storage = new InMemoryTokenStorage();
    await expect(storage.delete('nonexistent')).resolves.toBeUndefined();
  });

  it('stores tokens independently for multiple users', async () => {
    const storage = new InMemoryTokenStorage();
    const t1 = makeTokenSet({ accessToken: 'tok-user1' });
    const t2 = makeTokenSet({ accessToken: 'tok-user2' });
    await storage.save('user-1', t1);
    await storage.save('user-2', t2);

    const l1 = await storage.load('user-1');
    const l2 = await storage.load('user-2');
    expect(l1?.accessToken).toBe('tok-user1');
    expect(l2?.accessToken).toBe('tok-user2');
  });

  it('stores a deep copy — mutating the original does not affect stored value', async () => {
    const storage = new InMemoryTokenStorage();
    const tokens = makeTokenSet({ accessToken: 'original' });
    await storage.save('user-1', tokens);
    tokens.accessToken = 'mutated';
    const loaded = await storage.load('user-1');
    expect(loaded?.accessToken).toBe('original');
  });

  it('reports correct size after operations', async () => {
    const storage = new InMemoryTokenStorage();
    expect(storage.size).toBe(0);
    await storage.save('user-1', makeTokenSet());
    expect(storage.size).toBe(1);
    await storage.save('user-2', makeTokenSet());
    expect(storage.size).toBe(2);
    await storage.delete('user-1');
    expect(storage.size).toBe(1);
  });

  it('clear() removes all tokens', async () => {
    const storage = new InMemoryTokenStorage();
    await storage.save('u1', makeTokenSet());
    await storage.save('u2', makeTokenSet());
    storage.clear();
    expect(storage.size).toBe(0);
    expect(await storage.load('u1')).toBeNull();
  });

  it('stores token without refreshToken (optional field)', async () => {
    const storage = new InMemoryTokenStorage();
    const tokens = makeTokenSet({ refreshToken: undefined });
    await storage.save('user-1', tokens);
    const loaded = await storage.load('user-1');
    expect(loaded?.refreshToken).toBeUndefined();
  });
});
