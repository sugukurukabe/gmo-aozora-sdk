import type { TokenSet, TokenStorage } from './interface.js';

/**
 * In-memory token storage — for development and testing only.
 * Do NOT use in production; tokens are lost on process restart.
 */
export class InMemoryTokenStorage implements TokenStorage {
  private readonly store = new Map<string, TokenSet>();

  save(userId: string, tokens: TokenSet): Promise<void> {
    this.store.set(userId, { ...tokens });
    return Promise.resolve();
  }

  load(userId: string): Promise<TokenSet | null> {
    return Promise.resolve(this.store.get(userId) ?? null);
  }

  delete(userId: string): Promise<void> {
    this.store.delete(userId);
    return Promise.resolve();
  }

  /** Convenience helper for tests: clear all stored tokens. */
  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}
