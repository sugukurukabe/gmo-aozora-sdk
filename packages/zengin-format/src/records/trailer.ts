import { assertByteLength, encodeShiftJis } from '../encoding.js';
import { padLeftZero } from '../padding.js';

const RECORD_LENGTH = 120;
const DUMMY_LENGTH = 101;

/**
 * Build the trailer record (レコード区分 = '8').
 *
 * Layout (byte offsets, 1-indexed):
 *  [1]      レコード区分  1  '8'
 *  [2-7]    合計件数      6  zero-padded
 *  [8-19]   合計金額     12  zero-padded
 *  [20-120] ダミー       101 spaces
 *
 * Total: 1+6+12+101 = 120
 */
export function buildTrailerRecord(totalCount: number, totalAmount: bigint): Buffer {
  const parts: string[] = [
    '8',
    padLeftZero(totalCount.toString(), 6),
    padLeftZero(totalAmount.toString(), 12),
    ' '.repeat(DUMMY_LENGTH),
  ];

  const record = parts.join('');
  const buf = encodeShiftJis(record);
  assertByteLength(buf, RECORD_LENGTH);
  return buf;
}
