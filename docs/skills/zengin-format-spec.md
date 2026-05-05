# Zengin Format Specification Skill

> Use this skill for authoritative Zengin format byte layouts, field
> constraints, and encoding requirements.

## Summary

全銀協標準通信プロトコル defines fixed-length 120-byte records in Shift_JIS.
Files are used to instruct bulk bank transfers (給与/賞与振込) in Japan.

## File Layout

```
Record 1:    Header (レコード区分 = '1')
Records 2-N: Data   (レコード区分 = '2')
Record N+1:  Trailer (レコード区分 = '8')
Record N+2:  End     (レコード区分 = '9')
```

## Encoding Rules

1. All records are exactly 120 bytes in **Shift_JIS (CP932)**
2. Text fields: **半角カナ (half-width katakana)** + ASCII only
3. Numeric fields: ASCII digits, right-justified, zero-padded
4. Remaining text space: space-padded (0x20)
5. Voiced consonants (ガ) encode as 2 bytes (ｶ + dakuten ﾞ)

## Critical: Byte Length Verification

Always verify the byte length of each record after construction:

```typescript
const record = buildDataRecord(item);
const bytes = Buffer.from(record, 'shift_jis');
if (bytes.length !== 120) {
  throw new Error(`Record byte length ${bytes.length} !== 120`);
}
```

## 種別コード (Shorui)

| Code | Meaning |
|---|---|
| `11` | 給与振込 (payroll) |
| `12` | 賞与振込 (bonus) |

These are the only valid codes. Any other value is a spec violation.

## Half-Width Kana Conversion Reference

| Full-width | Half-width | Bytes |
|---|---|---|
| ア | ｱ | 1 |
| ガ | ｶﾞ | 2 |
| パ | ﾊﾟ | 2 |
| ー | ｰ | 1 |
| 「 | ｢ | 1 |

Common banking name characters: ｶ ｷ ｸ ｹ ｺ ｻ ｼ ｽ ｾ ｿ ﾀ ﾁ ﾂ ﾃ ﾄ etc.

## Golden Test Sources

The following public PDFs contain sample Zengin files that should be used
as golden test fixtures. Always cite the URL in the fixture file header:

- 全銀協公式サンプル: https://www.zengin-net.or.jp/ (要確認)
- 各銀行の仕様書サンプル: GMO Aozora, Hiroshima Bank, Gunma Bank etc.
