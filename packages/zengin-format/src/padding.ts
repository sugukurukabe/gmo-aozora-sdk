import { encodeShiftJis } from './encoding.js';

/**
 * Pad a numeric string on the left with zeros to exactly `len` bytes,
 * or truncate from the left if already longer.
 *
 * Operates in Shift_JIS byte space (ASCII digits are 1 byte each).
 */
export function padLeftZero(value: string, len: number): string {
  const clean = value.replace(/\D/g, '');
  return clean.padStart(len, '0').slice(-len);
}

/**
 * Pad a kana/ASCII string on the right with spaces to exactly `len` bytes,
 * or truncate from the right at the byte boundary.
 *
 * Half-width kana characters are 1 byte in Shift_JIS, so this is safe.
 * Throws ZenginEncodingError if the string contains unsupported characters.
 */
export function padRightSpace(value: string, len: number): string {
  const encoded = encodeShiftJis(value);
  if (encoded.byteLength >= len) {
    // Truncate at byte boundary — safe because all chars are 1 byte
    return value.slice(0, len);
  }
  return value + ' '.repeat(len - encoded.byteLength);
}
