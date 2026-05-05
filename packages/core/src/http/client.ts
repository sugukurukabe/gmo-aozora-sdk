import { z } from 'zod';
import {
  GmoAozoraApiError,
  GmoAozoraAuthError,
  GmoAozoraServerError,
  GmoAozoraTimeoutError,
  GmoAozoraValidationError,
} from '../errors/index.js';
import type { TokenSet } from '../storage/index.js';
import type { Logger } from './logger.js';
import { NoopLogger } from './logger.js';
import { RateLimiter } from './rate-limiter.js';
import { ApiErrorBodySchema } from './api-error-body.js';
import { generateUuidV7 } from './uuid.js';

const CORP_PREFIX = '/ganb/api/corporation/v1';

// Sunabar uses a different path prefix (no /ganb/api/ segment).
// Confirmed at https://gmo-aozora.com/sunabar/tutorial/01.html:
//   "https://api.sunabar.gmo-aozora.com/{{type}}/v1/{{api}}"
const CORP_PREFIX_SUNABAR = '/corporation/v1';

const RETRIABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

type HttpClientConfig = {
  baseUrl: string;
  getAccessToken: () => Promise<string>;
  refreshTokens: () => Promise<TokenSet>;
  logger?: Logger;
  rateLimiter?: RateLimiter;
  timeoutMs?: number;
  maxRetries?: number;
  /** Override the corporation API path prefix. Default: /ganb/api/corporation/v1 */
  corpPrefix?: string;
};

type GetOpts<T> = {
  schema: z.ZodType<T>;
  query?: Record<string, string | undefined>;
};

type MutateOpts<T> = {
  schema: z.ZodType<T>;
  body: unknown;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt: number): number {
  const base = [500, 1000, 2000][attempt] ?? 2000;
  const jitter = Math.floor(base * 0.1 * Math.random());
  return base + jitter;
}

// Retry-After can be delta-seconds or an HTTP-date (RFC 7231 §7.1.3).
// Returns the wait in ms, or null if the header is absent or unparsable.
function parseRetryAfterMs(headerValue: string | null): number | null {
  if (headerValue === null) return null;
  const seconds = Number(headerValue);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds, 60) * 1000;
  }
  const dateMs = Date.parse(headerValue);
  if (Number.isFinite(dateMs)) {
    return Math.max(0, Math.min(dateMs - Date.now(), 60_000));
  }
  return null;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly getAccessToken: () => Promise<string>;
  private readonly refreshTokens: () => Promise<TokenSet>;
  private readonly logger: Logger;
  private readonly rateLimiter: RateLimiter;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly corpPrefix: string;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl;
    this.corpPrefix = config.corpPrefix ?? CORP_PREFIX;
    this.getAccessToken = config.getAccessToken;
    this.refreshTokens = config.refreshTokens;
    this.logger = config.logger ?? new NoopLogger();
    this.rateLimiter = config.rateLimiter ?? new RateLimiter();
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.maxRetries = config.maxRetries ?? 2;
  }

  async get<T>(path: string, opts: GetOpts<T>): Promise<T> {
    const url = this.buildUrl(path, opts.query);
    return this.executeWithRetry('GET', url, opts.schema, undefined);
  }

  async post<T>(path: string, opts: MutateOpts<T>): Promise<T> {
    const url = this.buildUrl(path);
    return this.executeWithRetry('POST', url, opts.schema, opts.body);
  }

  async patch<T>(path: string, opts: MutateOpts<T>): Promise<T> {
    const url = this.buildUrl(path);
    return this.executeWithRetry('PATCH', url, opts.schema, opts.body);
  }

  async delete(path: string): Promise<void> {
    const url = this.buildUrl(path);
    await this.executeWithRetry('DELETE', url, z.unknown(), undefined);
  }

  private buildUrl(path: string, query?: Record<string, string | undefined>): string {
    const fullPath = path.startsWith('/ganb/') ? path : `${this.corpPrefix}${path}`;
    const url = new URL(`${this.baseUrl}${fullPath}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) url.searchParams.set(k, v);
      }
    }
    return url.toString();
  }

  private async executeWithRetry<T>(
    method: string,
    url: string,
    schema: z.ZodType<T>,
    body: unknown,
    attempt = 0,
    refreshed = false,
  ): Promise<T> {
    await this.rateLimiter.acquire();

    const requestId = generateUuidV7();
    const accessToken = await this.getAccessToken();

    const headers: Record<string, string> = {
      'x-access-token': accessToken,
      Accept: 'application/json;charset=UTF-8',
      'x-request-id': requestId,
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json;charset=UTF-8';
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      const fetchInit: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };
      if (body !== undefined) fetchInit.body = JSON.stringify(body);

      this.logger.debug('http_request', { method, url, requestId });
      response = await fetch(url, fetchInit);
    } catch (e) {
      clearTimeout(timeout);
      const isAbort = e instanceof DOMException && e.name === 'AbortError';
      if (isAbort) {
        throw new GmoAozoraTimeoutError({
          message: `Request timed out after ${this.timeoutMs}ms: ${method} ${url}`,
        });
      }
      if (attempt < this.maxRetries) {
        this.logger.warn('http_retry_network', { method, url, attempt, error: String(e) });
        await sleep(backoffMs(attempt));
        return this.executeWithRetry(method, url, schema, body, attempt + 1, refreshed);
      }
      throw new GmoAozoraApiError({
        code: 'NETWORK_ERROR',
        message: `Network error: ${String(e)}`,
        status: 0,
      });
    } finally {
      clearTimeout(timeout);
    }

    const status = response.status;
    this.logger.debug('http_response', { method, url, status, requestId });

    // 401: try token refresh once
    if (status === 401 && !refreshed) {
      try {
        await this.refreshTokens();
      } catch {
        throw new GmoAozoraAuthError({
          code: 'REFRESH_FAILED',
          message: 'Token refresh failed after 401.',
          requestId,
        });
      }
      return this.executeWithRetry(method, url, schema, body, attempt, true);
    }

    // Retriable: 429 / 5xx
    if (RETRIABLE_STATUSES.has(status) && attempt < this.maxRetries) {
      const waitMs = parseRetryAfterMs(response.headers.get('Retry-After')) ?? backoffMs(attempt);
      this.logger.warn('http_retry', { method, url, status, attempt, waitMs });
      await sleep(waitMs);
      return this.executeWithRetry(method, url, schema, body, attempt + 1, refreshed);
    }

    // Error responses
    if (!response.ok) {
      const rawErr: unknown = await response.json().catch(() => ({}));
      const parsedErr = ApiErrorBodySchema.safeParse(rawErr);
      const errorBody = parsedErr.success ? parsedErr.data : {};
      const code = typeof errorBody.errorCode === 'string' ? errorBody.errorCode : `HTTP_${status}`;
      const message =
        typeof errorBody.errorMessage === 'string'
          ? errorBody.errorMessage
          : `Request failed with status ${status}`;

      if (status >= 500) {
        throw new GmoAozoraServerError({ status, message, requestId });
      }
      if (status === 401) {
        throw new GmoAozoraAuthError({ code: 'UNAUTHORIZED', message, requestId });
      }
      throw new GmoAozoraApiError({ code, message, status, requestId });
    }

    // 204 No Content
    if (status === 204 || method === 'DELETE') {
      return undefined as T;
    }

    const raw = await response.json();
    const result = schema.safeParse(raw);
    if (!result.success) {
      throw new GmoAozoraValidationError({
        message: `Response validation failed for ${method} ${url}`,
        issues: result.error.issues,
        requestId,
      });
    }
    return result.data;
  }
}
