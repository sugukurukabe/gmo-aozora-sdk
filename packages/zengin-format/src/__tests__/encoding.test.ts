import { describe, it, expect } from 'vitest';
import { encodeShiftJis, assertByteLength, ZenginEncodingError } from '../encoding.js';

describe('encodeShiftJis', () => {
  it('encodes ASCII characters correctly', () => {
    const buf = encodeShiftJis('ABC 123');
    expect(buf.byteLength).toBe(7);
    expect(buf[0]).toBe(0x41); // 'A'
    expect(buf[4]).toBe(0x31); // '1'
  });

  it('encodes half-width kana to correct Shift_JIS bytes', () => {
    // ｱ = U+FF71 → Shift_JIS 0xB1
    const buf = encodeShiftJis('ｱｲｳ');
    expect(buf.byteLength).toBe(3);
    expect(buf[0]).toBe(0xb1);
    expect(buf[1]).toBe(0xb2);
    expect(buf[2]).toBe(0xb3);
  });

  it('encodes dakuten marker ﾞ to 0xDE', () => {
    // ｶﾞ = 0xB6 + 0xDE
    const buf = encodeShiftJis('ｶﾞ');
    expect(buf.byteLength).toBe(2);
    expect(buf[0]).toBe(0xb6);
    expect(buf[1]).toBe(0xde);
  });

  it('throws ZenginEncodingError for unsupported characters', () => {
    expect(() => encodeShiftJis('田')).toThrow(ZenginEncodingError);
    expect(() => encodeShiftJis('ガ')).toThrow(ZenginEncodingError); // full-width, not half-width
  });

  it('encodes spaces correctly', () => {
    const buf = encodeShiftJis('   ');
    expect(buf.byteLength).toBe(3);
    expect(buf[0]).toBe(0x20);
  });
});

describe('assertByteLength', () => {
  it('does not throw when length matches', () => {
    const buf = Buffer.alloc(120);
    expect(() => assertByteLength(buf, 120)).not.toThrow();
  });

  it('throws when length does not match', () => {
    const buf = Buffer.alloc(119);
    expect(() => assertByteLength(buf, 120)).toThrow('120');
  });
});
