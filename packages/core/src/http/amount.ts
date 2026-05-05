import { GmoAozoraValidationError } from '../errors/index.js';

const AMOUNT_PATTERN = /^\d+$/;

/**
 * Parse a GMO Aozora amount string to bigint.
 * GMO returns amounts as strings ("5800"), never numbers.
 * Use bigint for all monetary arithmetic — never float.
 */
export function parseAmount(value: string): bigint {
  if (!AMOUNT_PATTERN.test(value)) {
    throw new GmoAozoraValidationError({
      message: `Invalid amount format: "${value}". Expected a non-negative integer string like "5800".`,
    });
  }
  return BigInt(value);
}

/**
 * Format a bigint amount back to the string format GMO expects.
 */
export function formatAmount(value: bigint): string {
  if (value < 0n) {
    throw new GmoAozoraValidationError({
      message: `Amount must be non-negative, got ${value}.`,
    });
  }
  return value.toString();
}
