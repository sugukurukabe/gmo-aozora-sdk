import { describe, it, expect } from 'vitest';
import { toHalfWidthKana } from '../kana.js';

describe('toHalfWidthKana', () => {
  it('converts plain full-width katakana to half-width', () => {
    expect(toHalfWidthKana('アイウエオ')).toBe('ｱｲｳｴｵ');
  });

  it('converts voiced consonants (dakuten) to 2-byte half-width', () => {
    expect(toHalfWidthKana('ガギグゲゴ')).toBe('ｶﾞｷﾞｸﾞｹﾞｺﾞ');
    expect(toHalfWidthKana('ザジズゼゾ')).toBe('ｻﾞｼﾞｽﾞｾﾞｿﾞ');
    expect(toHalfWidthKana('ダヂヅデド')).toBe('ﾀﾞﾁﾞﾂﾞﾃﾞﾄﾞ');
    expect(toHalfWidthKana('バビブベボ')).toBe('ﾊﾞﾋﾞﾌﾞﾍﾞﾎﾞ');
  });

  it('converts semi-voiced consonants (handakuten) to 2-byte half-width', () => {
    expect(toHalfWidthKana('パピプペポ')).toBe('ﾊﾟﾋﾟﾌﾟﾍﾟﾎﾟ');
  });

  it('converts ヴ to ｳﾞ', () => {
    expect(toHalfWidthKana('ヴ')).toBe('ｳﾞ');
  });

  it('converts small kana', () => {
    expect(toHalfWidthKana('ァィゥェォ')).toBe('ｧｨｩｪｫ');
    expect(toHalfWidthKana('ッャュョ')).toBe('ｯｬｭｮ');
  });

  it('converts long vowel mark and punctuation', () => {
    expect(toHalfWidthKana('ター')).toBe('ﾀｰ');
    expect(toHalfWidthKana('ス・テーキ')).toBe('ｽ･ﾃｰｷ');
  });

  it('converts full-width ASCII to half-width', () => {
    expect(toHalfWidthKana('ＡＢＣＤ')).toBe('ABCD');
    expect(toHalfWidthKana('１２３')).toBe('123');
  });

  it('passes through existing half-width kana unchanged', () => {
    expect(toHalfWidthKana('ｱｲｳｴｵ')).toBe('ｱｲｳｴｵ');
  });

  it('passes through ASCII unchanged', () => {
    expect(toHalfWidthKana('ABC 123')).toBe('ABC 123');
  });

  it('replaces unsupported characters (kanji, hiragana) with space', () => {
    expect(toHalfWidthKana('田中')).toBe('  ');
    expect(toHalfWidthKana('あいう')).toBe('   ');
  });

  it('handles mixed input with company name pattern', () => {
    const result = toHalfWidthKana('スギクル（カブ）');
    expect(result).toContain('ｽｷﾞｸﾙ');
  });
});
