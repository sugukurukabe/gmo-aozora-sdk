import { GmoAozoraAuthError, GmoAozoraStateMismatchError } from '../errors/index.js';
import type { TokenSet, TokenStorage } from '../storage/index.js';
import { generateCodeChallenge, generateCodeVerifier, generateState, verifyState } from './pkce.js';

export type GmoEnvironment = 'sunabar' | 'staging' | 'production';

const AUTH_BASE_URLS: Record<GmoEnvironment, string> = {
  // Sunabar: https://gmo-aozora.com/sunabar/tutorial/01.html
  sunabar: 'https://api.sunabar.gmo-aozora.com',
  staging: 'https://stg-api.gmo-aozora.com',
  production: 'https://api.gmo-aozora.com',
};

const API_BASE_URLS: Record<GmoEnvironment, string> = {
  sunabar: 'https://api.sunabar.gmo-aozora.com',
  staging: 'https://stg-api.gmo-aozora.com',
  production: 'https://api.gmo-aozora.com',
};

// Auth path differs between environments.
// Sunabar: /auth/v1  (no /ganb/ prefix — confirmed from official Sunabar docs)
// Staging: /ganb/stg-api/auth/v1  (from official Node.js SDK conf.json)
// Production: /ganb/api/auth/v1
const AUTH_PATHS: Record<GmoEnvironment, string> = {
  sunabar: '/auth/v1',
  staging: '/ganb/stg-api/auth/v1',
  production: '/ganb/api/auth/v1',
};

export const PRIVATE_SCOPES = {
  ACCOUNT: 'private:account',
  TRANSFER: 'private:transfer',
  OFFLINE_ACCESS: 'private:offline_access',
} as const;

export type PrivateScope = (typeof PRIVATE_SCOPES)[keyof typeof PRIVATE_SCOPES];

// Corporation API path prefix differs between environments.
// Sunabar: /corporation/v1  (official docs: api.sunabar.gmo-aozora.com/{type}/v1/{api})
// Staging/Production: /ganb/api/corporation/v1
export const CORP_PREFIXES: Record<GmoEnvironment, string> = {
  sunabar: '/corporation/v1',
  staging: '/ganb/api/corporation/v1',
  production: '/ganb/api/corporation/v1',
};

export type OAuthConfig = {
  environment: GmoEnvironment;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  defaultScopes?: readonly string[];
};

export type PkceSession = {
  codeVerifier: string;
  state: string;
  scopes: readonly string[];
};

export type TokenExchangeParams = {
  code: string;
  state: string;
  session: PkceSession;
};

function getAuthBaseUrl(environment: GmoEnvironment): string {
  return AUTH_BASE_URLS[environment];
}

export function getApiBaseUrl(environment: GmoEnvironment): string {
  return API_BASE_URLS[environment];
}

export class OAuthClient {
  private readonly config: OAuthConfig;
  private readonly storage: TokenStorage;

  constructor(config: OAuthConfig, storage: TokenStorage) {
    this.config = config;
    this.storage = storage;
  }

  /**
   * Build the authorization URL and return a PKCE session to save client-side.
   */
  buildAuthorizationUrl(scopes?: readonly string[]): { url: string; session: PkceSession } {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();
    const resolvedScopes = scopes ?? this.config.defaultScopes ?? [PRIVATE_SCOPES.ACCOUNT];

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: resolvedScopes.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const base = getAuthBaseUrl(this.config.environment);
    const authPath = AUTH_PATHS[this.config.environment];
    const url = `${base}${authPath}/authorization?${params.toString()}`;

    return { url, session: { codeVerifier, state, scopes: resolvedScopes } };
  }

  /**
   * Exchange the authorization code for tokens.
   * Verifies the state parameter before exchanging.
   */
  async exchangeCode(userId: string, params: TokenExchangeParams): Promise<TokenSet> {
    if (!verifyState(params.state, params.session.state)) {
      throw new GmoAozoraStateMismatchError();
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code_verifier: params.session.codeVerifier,
    });

    const tokens = await this.postToken(body.toString());
    await this.storage.save(userId, tokens);
    return tokens;
  }

  /**
   * Refresh tokens for a user. Throws GmoAozoraAuthError if refresh fails.
   */
  async refreshTokens(userId: string): Promise<TokenSet> {
    const existing = await this.storage.load(userId);
    if (!existing?.refreshToken) {
      throw new GmoAozoraAuthError({
        code: 'NO_REFRESH_TOKEN',
        message: 'No refresh token available for user. Re-authorization required.',
      });
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: existing.refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    try {
      const tokens = await this.postToken(body.toString());
      await this.storage.save(userId, tokens);
      return tokens;
    } catch (e) {
      if (e instanceof GmoAozoraAuthError) throw e;
      throw new GmoAozoraAuthError({
        code: 'REFRESH_FAILED',
        message: 'Token refresh failed.',
        cause: e,
      });
    }
  }

  /**
   * Revoke the user's refresh or access token at the authorization server,
   * then delete stored credentials for `userId`.
   *
   * @param userId — stable user key used with `TokenStorage`
   */
  async revokeTokens(userId: string): Promise<void> {
    const existing = await this.storage.load(userId);
    if (!existing) return;

    const tokenToRevoke = existing.refreshToken ?? existing.accessToken;
    const body = new URLSearchParams({
      token: tokenToRevoke,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    const base = getAuthBaseUrl(this.config.environment);
    const authPath = AUTH_PATHS[this.config.environment];
    await fetch(`${base}${authPath}/tokens/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    await this.storage.delete(userId);
  }

  /**
   * Returns a valid access token. If expiry is within **60 seconds**, refreshes
   * first (see rule `10-oauth-pkce.mdc`).
   *
   * @param userId — stable user key used with `TokenStorage`
   */
  async getAccessToken(userId: string): Promise<string> {
    const tokens = await this.storage.load(userId);
    if (!tokens) {
      throw new GmoAozoraAuthError({
        code: 'NOT_AUTHENTICATED',
        message: `User ${userId} is not authenticated. Call buildAuthorizationUrl() first.`,
      });
    }

    if (tokens.expiresAt - Date.now() < 60_000) {
      const refreshed = await this.refreshTokens(userId);
      return refreshed.accessToken;
    }

    return tokens.accessToken;
  }

  private async postToken(body: string): Promise<TokenSet> {
    const base = getAuthBaseUrl(this.config.environment);
    const authPath = AUTH_PATHS[this.config.environment];
    const response = await fetch(`${base}${authPath}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json;charset=UTF-8',
      },
      body,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const errData = errBody as Record<string, unknown>;
      throw new GmoAozoraAuthError({
        code: typeof errData['error'] === 'string' ? errData['error'] : 'TOKEN_ERROR',
        message:
          typeof errData['error_description'] === 'string'
            ? errData['error_description']
            : `Token request failed with status ${response.status}`,
      });
    }

    const data = (await response.json()) as Record<string, unknown>;

    return {
      accessToken: data['access_token'] as string,
      refreshToken: typeof data['refresh_token'] === 'string' ? data['refresh_token'] : undefined,
      expiresAt: Date.now() + (data['expires_in'] as number) * 1000,
      tokenType: (data['token_type'] as string) ?? 'Bearer',
      scope: (data['scope'] as string) ?? '',
    };
  }
}
