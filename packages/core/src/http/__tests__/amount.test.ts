import { describe, it, expect } from 'vitest';
import { parseAmount, formatAmount } from '../amount.js';
import { GmoAozoraValidationError } from '../../errors/index.js';

describe('parseAmount', () => {
  it('converts "5800" to 5800n', () => {
    expect(parseAmount('5800')).toBe(5800n);
  });

  it('converts "0" to 0n', () => {
    expect(parseAmount('0')).toBe(0n);
  });

  it('converts large amounts correctly', () => {
    expect(parseAmount('999999999999')).toBe(999999999999n);
  });

  it('throws GmoAozoraValidationError for empty string', () => {
    expect(() => parseAmount('')).toThrow(GmoAozoraValidationError);
  });

  it('throws for decimal string "58.00"', () => {
    expect(() => parseAmount('58.00')).toThrow(GmoAozoraValidationError);
  });

  it('throws for negative string "-5800"', () => {
    expect(() => parseAmount('-5800')).toThrow(GmoAozoraValidationError);
  });

  it('throws for non-numeric string "abc"', () => {
    expect(() => parseAmount('abc')).toThrow(GmoAozoraValidationError);
  });

  it('throws for amount with spaces', () => {
    expect(() => parseAmount(' 5800')).toThrow(GmoAozoraValidationError);
  });
});

describe('formatAmount', () => {
  it('formats 5800n as "5800"', () => {
    expect(formatAmount(5800n)).toBe('5800');
  });

  it('formats 0n as "0"', () => {
    expect(formatAmount(0n)).toBe('0');
  });

  it('throws for negative bigint', () => {
    expect(() => formatAmount(-1n)).toThrow(GmoAozoraValidationError);
  });

  it('round-trips: parseAmount(formatAmount(x)) === x', () => {
    const original = 38_000_000n;
    expect(parseAmount(formatAmount(original))).toBe(original);
  });
});
