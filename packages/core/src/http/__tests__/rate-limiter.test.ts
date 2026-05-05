import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RateLimiter } from '../rate-limiter.js';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('allows immediate acquire when bucket is full', async () => {
    const rl = new RateLimiter({ maxTokens: 5, refillRatePerSecond: 5 });
    const start = Date.now();
    await rl.acquire();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50); // near-instant
    expect(rl.availableTokens).toBe(4);
  });

  it('starts with maxTokens available', () => {
    const rl = new RateLimiter({ maxTokens: 10, refillRatePerSecond: 10 });
    expect(rl.availableTokens).toBe(10);
  });

  it('decrements token count on each acquire', async () => {
    const rl = new RateLimiter({ maxTokens: 3, refillRatePerSecond: 100 });
    await rl.acquire();
    expect(rl.availableTokens).toBe(2);
    await rl.acquire();
    expect(rl.availableTokens).toBe(1);
    await rl.acquire();
    expect(rl.availableTokens).toBe(0);
  });

  it('allows acquiring exactly maxTokens times without waiting', async () => {
    vi.useFakeTimers();
    const rl = new RateLimiter({ maxTokens: 3, refillRatePerSecond: 1 });
    // 3 immediate acquires should not need to wait
    const p1 = rl.acquire();
    const p2 = rl.acquire();
    const p3 = rl.acquire();
    vi.advanceTimersByTime(0);
    await Promise.all([p1, p2, p3]);
    expect(rl.availableTokens).toBe(0);
  });
});
