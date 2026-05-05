type RateLimiterConfig = {
  maxTokens: number;
  refillRatePerSecond: number;
};

/**
 * Token-bucket rate limiter.
 * Default: 10 tokens max, refills at 10/s — matches GMO Aozora's guideline.
 * `acquire()` is async and waits the minimum necessary time when the bucket is empty.
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillIntervalMs: number;

  constructor(config: RateLimiterConfig = { maxTokens: 10, refillRatePerSecond: 10 }) {
    this.maxTokens = config.maxTokens;
    this.tokens = config.maxTokens;
    this.lastRefill = Date.now();
    // How many ms until one token is added
    this.refillIntervalMs = 1000 / config.refillRatePerSecond;
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Wait until a token is available
    const waitMs = Math.ceil(this.refillIntervalMs - (Date.now() - this.lastRefill));
    if (waitMs > 0) {
      await sleep(waitMs);
    }
    this.refill();
    this.tokens = Math.max(0, this.tokens - 1);
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = Math.floor(elapsed / this.refillIntervalMs);
    if (newTokens > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
      this.lastRefill = now;
    }
  }

  get availableTokens(): number {
    return this.tokens;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
