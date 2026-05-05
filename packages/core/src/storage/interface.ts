export type TokenSet = {
  accessToken: string;
  refreshToken?: string | undefined;
  expiresAt: number;
  tokenType: string;
  scope: string;
};

export interface TokenStorage {
  save(userId: string, tokens: TokenSet): Promise<void>;
  load(userId: string): Promise<TokenSet | null>;
  delete(userId: string): Promise<void>;
}
