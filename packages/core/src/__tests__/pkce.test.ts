import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  verifyState,
} from '../auth/pkce.js';

describe('generateCodeVerifier', () => {
  it('returns a string of at least 43 characters', () => {
    const v = generateCodeVerifier();
    expect(typeof v).toBe('string');
    expect(v.length).toBeGreaterThanOrEqual(43);
  });

  it('returns a different value each call', () => {
    const a = generateCodeVerifier();
    const b = generateCodeVerifier();
    expect(a).not.toBe(b);
  });

  it('contains only base64url characters (no +, /, =)', () => {
    const v = generateCodeVerifier();
    expect(v).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('generateCodeChallenge', () => {
  it('produces correct S256 challenge for a known verifier', () => {
    // RFC 7636 example: verifier 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    // challenge = base64url(sha256(verifier))
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const expectedChallenge = createHash('sha256').update(verifier, 'ascii').digest('base64url');
    expect(generateCodeChallenge(verifier)).toBe(expectedChallenge);
  });

  it('is deterministic for the same verifier', () => {
    const verifier = generateCodeVerifier();
    expect(generateCodeChallenge(verifier)).toBe(generateCodeChallenge(verifier));
  });

  it('produces different challenges for different verifiers', () => {
    const a = generateCodeVerifier();
    const b = generateCodeVerifier();
    expect(generateCodeChallenge(a)).not.toBe(generateCodeChallenge(b));
  });

  it('returns a base64url string without padding', () => {
    const challenge = generateCodeChallenge(generateCodeVerifier());
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge).not.toContain('=');
  });
});

describe('generateState', () => {
  it('returns a non-empty string', () => {
    const s = generateState();
    expect(typeof s).toBe('string');
    expect(s.length).toBeGreaterThan(0);
  });

  it('returns a different value each call', () => {
    const a = generateState();
    const b = generateState();
    expect(a).not.toBe(b);
  });

  it('contains only base64url characters', () => {
    const s = generateState();
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('verifyState', () => {
  it('returns true for equal states', () => {
    const state = generateState();
    expect(verifyState(state, state)).toBe(true);
  });

  it('returns false for different states', () => {
    const a = generateState();
    const b = generateState();
    expect(verifyState(a, b)).toBe(false);
  });

  it('returns false when lengths differ', () => {
    expect(verifyState('short', 'longer-string')).toBe(false);
  });

  it('returns false for empty vs non-empty', () => {
    expect(verifyState('', 'something')).toBe(false);
  });
});
