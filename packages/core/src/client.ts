import { OAuthClient, getApiBaseUrl, CORP_PREFIXES } from './auth/index.js';
import type {
  GmoEnvironment,
  OAuthConfig,
  PkceSession,
  TokenExchangeParams,
} from './auth/index.js';
import { AccountsApi } from './corporation/accounts.js';
import { BalancesApi } from './corporation/balances.js';
import { TransactionsApi } from './corporation/transactions.js';
import { VirtualAccountsApi } from './corporation/virtual-accounts.js';
import { TransfersApi } from './corporation/transfers.js';
import { BulkTransfersApi } from './corporation/bulk-transfers.js';
import { HttpClient } from './http/client.js';
import { InMemoryTokenStorage } from './storage/index.js';
import type { TokenSet, TokenStorage } from './storage/index.js';

export type GmoAozoraClientConfig = {
  environment: GmoEnvironment;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  defaultScopes?: readonly string[];
  tokenStorage?: TokenStorage;
};

/**
 * Main SDK entry point.
 *
 * Usage:
 *   const client = new GmoAozoraClient({ environment: 'sunabar', ... }).useUser('user-123');
 */
export class GmoAozoraClient {
  readonly environment: GmoEnvironment;
  readonly apiBaseUrl: string;
  private readonly oauthClient: OAuthClient;

  constructor(config: GmoAozoraClientConfig) {
    this.environment = config.environment;
    this.apiBaseUrl = getApiBaseUrl(config.environment);

    const storage = config.tokenStorage ?? new InMemoryTokenStorage();

    const oauthConfig: OAuthConfig = {
      environment: config.environment,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
    };
    if (config.defaultScopes !== undefined) oauthConfig.defaultScopes = config.defaultScopes;

    this.oauthClient = new OAuthClient(oauthConfig, storage);
  }

  /**
   * Bind this client to a specific user. Returns a user-scoped client.
   */
  useUser(userId: string): GmoAozoraUserClient {
    return new GmoAozoraUserClient(this, this.oauthClient, userId);
  }

  /**
   * Build an OAuth authorization URL for the PKCE flow.
   */
  buildAuthorizationUrl(scopes?: readonly string[]): { url: string; session: PkceSession } {
    return this.oauthClient.buildAuthorizationUrl(scopes);
  }
}

/**
 * A GmoAozoraClient bound to a specific user.
 * Manages tokens for that user and exposes the Corporation API namespaces.
 */
export class GmoAozoraUserClient {
  private readonly client: GmoAozoraClient;
  private readonly oauthClient: OAuthClient;
  private readonly userId: string;

  /** Corporation API namespaces */
  readonly corporation: {
    readonly accounts: AccountsApi;
    readonly balances: BalancesApi;
    readonly transactions: TransactionsApi;
    readonly virtualAccounts: VirtualAccountsApi;
    readonly transfers: TransfersApi;
    readonly bulkTransfers: BulkTransfersApi;
  };

  constructor(client: GmoAozoraClient, oauthClient: OAuthClient, userId: string) {
    this.client = client;
    this.oauthClient = oauthClient;
    this.userId = userId;

    const http = new HttpClient({
      baseUrl: client.apiBaseUrl,
      corpPrefix: CORP_PREFIXES[client.environment],
      getAccessToken: () => this.getAccessToken(),
      refreshTokens: () => this.refreshTokens(),
    });

    this.corporation = {
      accounts: new AccountsApi(http),
      balances: new BalancesApi(http),
      transactions: new TransactionsApi(http),
      virtualAccounts: new VirtualAccountsApi(http),
      transfers: new TransfersApi(http),
      bulkTransfers: new BulkTransfersApi(http),
    };
  }

  get environment(): GmoEnvironment {
    return this.client.environment;
  }

  get apiBaseUrl(): string {
    return this.client.apiBaseUrl;
  }

  /**
   * Exchange an OAuth authorization code for tokens. Call this after redirect.
   */
  async exchangeCode(params: TokenExchangeParams): Promise<TokenSet> {
    return this.oauthClient.exchangeCode(this.userId, params);
  }

  /**
   * Get a valid access token, refreshing if necessary.
   */
  async getAccessToken(): Promise<string> {
    return this.oauthClient.getAccessToken(this.userId);
  }

  /**
   * Explicitly refresh the access token.
   */
  async refreshTokens(): Promise<TokenSet> {
    return this.oauthClient.refreshTokens(this.userId);
  }

  /**
   * Revoke all tokens and clear stored credentials.
   */
  async revokeTokens(): Promise<void> {
    return this.oauthClient.revokeTokens(this.userId);
  }
}
