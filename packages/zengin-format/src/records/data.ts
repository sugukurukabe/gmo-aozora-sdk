import { toHalfWidthKana } from '../kana.js';
import { assertByteLength, encodeShiftJis } from '../encoding.js';
import { padLeftZero, padRightSpace } from '../padding.js';
import type { ZenginRecord } from '../types.js';

const RECORD_LENGTH = 120;

/**
 * Build one data record (レコード区分 = '2').
 *
 * Layout (byte offsets, 1-indexed):
 *  [1]       レコード区分     1  '2'
 *  [2-5]     取引銀行番号     4  zero-padded
 *  [6-20]    取引銀行名      15  space-padded (kana)
 *  [21-23]   取引支店番号     3  zero-padded
 *  [24-38]   取引支店名      15  space-padded (kana)
 *  [39]      預金種別         1
 *  [40-46]   口座番号         7  zero-padded
 *  [47-76]   受取人名        30  space-padded (kana)
 *  [77-86]   振込金額        10  zero-padded
 *  [87]      新規コード       1  '0' default
 *  [88-97]   顧客コード1     10  space-padded
 *  [98-107]  顧客コード2     10  space-padded
 *  [108]     振込指定区分     1  '0' default
 *  [109-118] EDI情報         10  space-padded
 *  [119-120] ダミー           2  spaces
 *
 * Total: 1+4+15+3+15+1+7+30+10+1+10+10+1+10+2 = 120
 */
export function buildDataRecord(rec: ZenginRecord): Buffer {
  const amount =
    typeof rec.amount === 'bigint' ? rec.amount.toString() : rec.amount.replace(/\D/g, '');

  const parts: string[] = [
    '2',
    padLeftZero(rec.bankCode, 4),
    padRightSpace(toHalfWidthKana(rec.bankName ?? ''), 15),
    padLeftZero(rec.branchCode, 3),
    padRightSpace(toHalfWidthKana(rec.branchName ?? ''), 15),
    rec.accountTypeCode,
    padLeftZero(rec.accountNumber, 7),
    padRightSpace(toHalfWidthKana(rec.beneficiaryName), 30),
    padLeftZero(amount, 10),
    rec.newCode ?? '0',
    padRightSpace(toHalfWidthKana(rec.customerCode1 ?? ''), 10),
    padRightSpace(toHalfWidthKana(rec.customerCode2 ?? ''), 10),
    rec.transferDesignation ?? '0',
    padRightSpace(toHalfWidthKana(rec.ediInfo ?? ''), 10),
    '  ',
  ];

  const record = parts.join('');
  const buf = encodeShiftJis(record);
  assertByteLength(buf, RECORD_LENGTH);
  return buf;
}
