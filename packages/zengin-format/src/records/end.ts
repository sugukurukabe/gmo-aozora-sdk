import { assertByteLength, encodeShiftJis } from '../encoding.js';

const RECORD_LENGTH = 120;

/**
 * Build the end record (レコード区分 = '9').
 *
 * Layout:
 *  [1]      レコード区分   1  '9'
 *  [2-120]  ダミー        119 spaces
 *
 * Total: 1+119 = 120
 */
export function buildEndRecord(): Buffer {
  const record = '9' + ' '.repeat(119);
  const buf = encodeShiftJis(record);
  assertByteLength(buf, RECORD_LENGTH);
  return buf;
}
