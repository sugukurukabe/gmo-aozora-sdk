/**
 * Full-width katakana → half-width katakana conversion.
 *
 * Voiced consonants (ガ etc.) become 2 half-width characters (ｶ + ﾞ).
 * Semi-voiced consonants (パ etc.) become 2 characters (ﾊ + ﾟ).
 * Full-width ASCII and digits are also narrowed.
 *
 * Only characters supported in Zengin half-width kana fields are produced.
 */

const VOICED: Record<string, string> = {
  ガ: 'ｶﾞ',
  ギ: 'ｷﾞ',
  グ: 'ｸﾞ',
  ゲ: 'ｹﾞ',
  ゴ: 'ｺﾞ',
  ザ: 'ｻﾞ',
  ジ: 'ｼﾞ',
  ズ: 'ｽﾞ',
  ゼ: 'ｾﾞ',
  ゾ: 'ｿﾞ',
  ダ: 'ﾀﾞ',
  ヂ: 'ﾁﾞ',
  ヅ: 'ﾂﾞ',
  デ: 'ﾃﾞ',
  ド: 'ﾄﾞ',
  バ: 'ﾊﾞ',
  ビ: 'ﾋﾞ',
  ブ: 'ﾌﾞ',
  ベ: 'ﾍﾞ',
  ボ: 'ﾎﾞ',
  ヴ: 'ｳﾞ',
};

const SEMI_VOICED: Record<string, string> = {
  パ: 'ﾊﾟ',
  ピ: 'ﾋﾟ',
  プ: 'ﾌﾟ',
  ペ: 'ﾍﾟ',
  ポ: 'ﾎﾟ',
};

const PLAIN: Record<string, string> = {
  ア: 'ｱ',
  イ: 'ｲ',
  ウ: 'ｳ',
  エ: 'ｴ',
  オ: 'ｵ',
  カ: 'ｶ',
  キ: 'ｷ',
  ク: 'ｸ',
  ケ: 'ｹ',
  コ: 'ｺ',
  サ: 'ｻ',
  シ: 'ｼ',
  ス: 'ｽ',
  セ: 'ｾ',
  ソ: 'ｿ',
  タ: 'ﾀ',
  チ: 'ﾁ',
  ツ: 'ﾂ',
  テ: 'ﾃ',
  ト: 'ﾄ',
  ナ: 'ﾅ',
  ニ: 'ﾆ',
  ヌ: 'ﾇ',
  ネ: 'ﾈ',
  ノ: 'ﾉ',
  ハ: 'ﾊ',
  ヒ: 'ﾋ',
  フ: 'ﾌ',
  ヘ: 'ﾍ',
  ホ: 'ﾎ',
  マ: 'ﾏ',
  ミ: 'ﾐ',
  ム: 'ﾑ',
  メ: 'ﾒ',
  モ: 'ﾓ',
  ヤ: 'ﾔ',
  ユ: 'ﾕ',
  ヨ: 'ﾖ',
  ラ: 'ﾗ',
  リ: 'ﾘ',
  ル: 'ﾙ',
  レ: 'ﾚ',
  ロ: 'ﾛ',
  ワ: 'ﾜ',
  ヲ: 'ｦ',
  ン: 'ﾝ',
  // Small kana
  ァ: 'ｧ',
  ィ: 'ｨ',
  ゥ: 'ｩ',
  ェ: 'ｪ',
  ォ: 'ｫ',
  ッ: 'ｯ',
  ャ: 'ｬ',
  ュ: 'ｭ',
  ョ: 'ｮ',
  // Punctuation / symbols
  ー: 'ｰ',
  '「': '｢',
  '」': '｣',
  '・': '･',
  '、': '､',
  '。': '｡',
};

const COMBINED: Record<string, string> = { ...VOICED, ...SEMI_VOICED, ...PLAIN };

/**
 * Convert a string to half-width kana suitable for Zengin text fields.
 *
 * - Full-width katakana → half-width katakana (voiced/semi-voiced expand to 2 bytes)
 * - Full-width ASCII (Ａ-Ｚ, ０-９) → half-width
 * - Full-width space → half-width space
 * - Characters that cannot be represented as half-width kana are replaced with space
 */
export function toHalfWidthKana(input: string): string {
  let result = '';
  for (const ch of input) {
    const mapped = COMBINED[ch];
    if (mapped !== undefined) {
      result += mapped;
      continue;
    }
    const cp = ch.codePointAt(0) ?? 0;
    // Full-width ASCII (Ａ-Ｚ → A-Z, ａ-ｚ → a-z, ０-９ → 0-9)
    if (cp >= 0xff01 && cp <= 0xff5e) {
      result += String.fromCharCode(cp - 0xfee0);
      continue;
    }
    // Full-width space
    if (cp === 0x3000) {
      result += ' ';
      continue;
    }
    // Half-width characters (ASCII + existing half-width kana) pass through
    if (cp <= 0x7e || (cp >= 0xff61 && cp <= 0xff9f)) {
      result += ch;
      continue;
    }
    // Unsupported character → space (graceful degradation)
    result += ' ';
  }
  return result;
}
