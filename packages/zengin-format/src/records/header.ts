import { toHalfWidthKana } from '../kana.js';
import { assertByteLength, encodeShiftJis } from '../encoding.js';
import { padLeftZero, padRightSpace } from '../padding.js';
import type { ZenginFileInput } from '../types.js';

const RECORD_LENGTH = 120;
const DUMMY_LENGTH = 17;

/**
 * Build the header record (レコード区分 = '1').
 *
 * Layout (byte offsets, 1-indexed per the 全銀協 standard):
 *  [1]      レコード区分     1  '1'
 *  [2-3]    種別コード       2  '11' or '12'
 *  [4]      コード区分       1  '0' (銀行番号)
 *  [5-14]   委託者コード    10  right-justified, zero-padded
 *  [15-54]  委託者名        40  space-padded right (kana)
 *  [55-58]  取組日           4  MMDD
 *  [59-62]  取引銀行番号     4  zero-padded
 *  [63-77]  取引銀行名      15  space-padded right (kana)
 *  [78-80]  取引支店番号     3  zero-padded
 *  [81-95]  取引支店名      15  space-padded right (kana)
 *  [96]     預金種別         1
 *  [97-103] 口座番号         7  zero-padded
 *  [104-120]ダミー          17  spaces
 *
 * Total: 1+2+1+10+40+4+4+15+3+15+1+7+17 = 120
 */
export function buildHeaderRecord(input: ZenginFileInput): Buffer {
  const { shorui, transferDate, remitter } = input;

  // 取組日: accept YYYYMMDD (8 chars) or MMDD (4 chars)
  const mmdd =
    transferDate.length >= 8 ? transferDate.slice(-4) : transferDate.padStart(4, '0').slice(-4);

  const parts: string[] = [
    '1',
    shorui,
    '0',
    padLeftZero(remitter.code, 10),
    padRightSpace(toHalfWidthKana(remitter.name), 40),
    mmdd,
    padLeftZero(remitter.bankCode, 4),
    padRightSpace(toHalfWidthKana(remitter.bankName), 15),
    padLeftZero(remitter.branchCode, 3),
    padRightSpace(toHalfWidthKana(remitter.branchName), 15),
    remitter.accountTypeCode,
    padLeftZero(remitter.accountNumber, 7),
    ' '.repeat(DUMMY_LENGTH),
  ];

  const record = parts.join('');
  const buf = encodeShiftJis(record);
  assertByteLength(buf, RECORD_LENGTH);
  return buf;
}
