import { createHash, randomBytes } from 'node:crypto';

/**
 * Generate a PKCE code verifier (43–128 unreserved URI characters).
 * Uses 32 random bytes → base64url (no padding) = 43 chars.
 */
export function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Compute the S256 code challenge for a given verifier.
 * codeChallenge = base64url(SHA-256(ASCII(codeVerifier)))
 */
export function generateCodeChallenge(codeVerifier: string): string {
  return createHash('sha256').update(codeVerifier, 'ascii').digest('base64url');
}

/**
 * Generate a cryptographically random state parameter (32 bytes → base64url).
 */
export function generateState(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Verify that a received state matches the saved state.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyState(received: string, saved: string): boolean {
  if (received.length !== saved.length) return false;
  // Use Buffer comparison for constant-time equality
  const a = Buffer.from(received, 'utf8');
  const b = Buffer.from(saved, 'utf8');
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}
