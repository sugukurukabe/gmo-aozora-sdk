/**
 * Zengin Shift_JIS encoding for the ASCII + half-width kana subset.
 *
 * In Shift_JIS:
 *   - ASCII (U+0020–U+007E) → same byte value
 *   - Half-width kana (U+FF61–U+FF9F) → 0xA1–0xDF (offset: -0xFF61 + 0xA1 = -0xFEC0)
 *
 * All Zengin text fields are required to contain only ASCII and half-width kana,
 * so this subset encoder is sufficient. No external iconv dependency is needed.
 */

export class ZenginEncodingError extends Error {
  readonly char: string;
  readonly codePoint: number;
  constructor(char: string, codePoint: number) {
    super(
      `Character "${char}" (U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}) cannot be encoded in Zengin Shift_JIS subset. ` +
        'Run toHalfWidthKana() before encoding.',
    );
    this.char = char;
    this.codePoint = codePoint;
    this.name = 'ZenginEncodingError';
  }
}

/**
 * Encode a string containing only ASCII and half-width kana to a Shift_JIS Buffer.
 *
 * @throws {ZenginEncodingError} if the string contains characters outside the supported subset.
 */
export function encodeShiftJis(text: string): Buffer {
  const bytes: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp >= 0x20 && cp <= 0x7e) {
      bytes.push(cp);
    } else if (cp >= 0xff61 && cp <= 0xff9f) {
      // half-width kana → 0xA1–0xDF
      bytes.push(cp - 0xff61 + 0xa1);
    } else {
      throw new ZenginEncodingError(ch, cp);
    }
  }
  return Buffer.from(bytes);
}

/**
 * Assert that the encoded buffer is exactly `expected` bytes.
 *
 * @throws {Error} if the length doesn't match.
 */
export function assertByteLength(buf: Buffer, expected: number): void {
  if (buf.byteLength !== expected) {
    throw new Error(`Zengin record must be exactly ${expected} bytes but got ${buf.byteLength}`);
  }
}
