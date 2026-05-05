/**
 * Golden file regression tests for @sugukuru/zengin-format.
 *
 * These tests lock the exact binary output for a canonical input.
 * Any change to encoding, record layout, or padding will fail this test.
 * Update the snapshot ONLY after confirming the new output is spec-correct.
 */
import { describe, it, expect } from 'vitest';
import { buildZenginFile } from '../builder.js';
import type { ZenginFileInput, ZenginRecord } from '../types.js';

const GOLDEN_REMITTER = {
  code: '0000000001',
  name: 'ｽｸﾞｸﾙ ｶﾌﾞｼｷｶﾞｲｼｬ',
  bankCode: '0310',
  bankName: 'ｼﾞｰｴﾑｵｰｱｵｿﾞﾗ',
  branchCode: '001',
  branchName: 'ﾎﾝﾃﾝ',
  accountTypeCode: '1' as const,
  accountNumber: '1234567',
};

const GOLDEN_RECORD: ZenginRecord = {
  bankCode: '0001',
  bankName: 'ｷﾉｸﾆﾔｷﾞﾝｺｳ',
  branchCode: '100',
  branchName: 'ﾎﾝﾃﾝ',
  accountTypeCode: '1',
  accountNumber: '0000001',
  beneficiaryName: 'ﾔﾏﾀﾞ ﾀﾛｳ',
  amount: BigInt(5800),
};

const GOLDEN_INPUT: ZenginFileInput = {
  shorui: '11',
  transferDate: '0601',
  remitter: GOLDEN_REMITTER,
  records: [GOLDEN_RECORD],
};

describe('Zengin golden file (byte-exact regression)', () => {
  it('1-record payroll file matches golden snapshot', () => {
    const buf = buildZenginFile(GOLDEN_INPUT);
    expect(buf.toString('hex')).toMatchSnapshot();
  });

  it('1-record bonus file (shorui=12) matches golden snapshot', () => {
    const buf = buildZenginFile({ ...GOLDEN_INPUT, shorui: '12' });
    expect(buf.toString('hex')).toMatchSnapshot();
  });

  it('record order is always header → data... → trailer → end', () => {
    const buf = buildZenginFile(GOLDEN_INPUT);
    // 1 header + 1 data + 1 trailer + 1 end = 4 records
    expect(buf.byteLength).toBe(480);
    expect(buf[0]).toBe(0x31); // '1' = header kubun
    expect(buf[120]).toBe(0x32); // '2' = data kubun
    expect(buf[240]).toBe(0x38); // '8' = trailer kubun
    expect(buf[360]).toBe(0x39); // '9' = end kubun
  });

  it('3-record file record order and kubun bytes are correct', () => {
    const records = [
      { ...GOLDEN_RECORD, amount: BigInt(1000) },
      { ...GOLDEN_RECORD, amount: BigInt(2000) },
      { ...GOLDEN_RECORD, amount: BigInt(3000) },
    ];
    const buf = buildZenginFile({ ...GOLDEN_INPUT, records });
    // 1 header + 3 data + 1 trailer + 1 end = 6 records
    expect(buf.byteLength).toBe(720);
    expect(buf[0]).toBe(0x31); // header
    expect(buf[120]).toBe(0x32); // data 1
    expect(buf[240]).toBe(0x32); // data 2
    expect(buf[360]).toBe(0x32); // data 3
    expect(buf[480]).toBe(0x38); // trailer
    expect(buf[600]).toBe(0x39); // end
  });

  it('trailer correctly sums multi-record amounts', () => {
    const records = [
      { ...GOLDEN_RECORD, amount: BigInt(10000) },
      { ...GOLDEN_RECORD, amount: BigInt(20000) },
      { ...GOLDEN_RECORD, amount: BigInt(30000) },
    ];
    const buf = buildZenginFile({ ...GOLDEN_INPUT, records });

    // Trailer is the 5th record (offset 480), amount at bytes 7–18 of trailer record
    const trailerOffset = 4 * 120;
    const countBytes = buf.slice(trailerOffset + 1, trailerOffset + 7).toString('ascii');
    const amountBytes = buf.slice(trailerOffset + 7, trailerOffset + 19).toString('ascii');
    expect(countBytes).toBe('000003');
    expect(amountBytes).toBe('000000060000');
  });

  it('all records are exactly 120 bytes each', () => {
    const buf = buildZenginFile(GOLDEN_INPUT);
    for (let i = 0; i < buf.byteLength; i += 120) {
      const record = buf.slice(i, i + 120);
      expect(record.byteLength).toBe(120);
    }
  });

  it('shorui byte is at header offset 1-2', () => {
    const payroll = buildZenginFile({ ...GOLDEN_INPUT, shorui: '11' });
    const bonus = buildZenginFile({ ...GOLDEN_INPUT, shorui: '12' });
    expect(payroll.slice(1, 3).toString('ascii')).toBe('11');
    expect(bonus.slice(1, 3).toString('ascii')).toBe('12');
  });

  it('multiple banks in single file (multi-bank readiness)', () => {
    const records = [
      { ...GOLDEN_RECORD, bankCode: '0001', bankName: 'ﾐｭｰｼﾞﾝｸﾞ' },
      { ...GOLDEN_RECORD, bankCode: '0005', bankName: 'ﾐﾂﾋﾞｼ' },
      { ...GOLDEN_RECORD, bankCode: '0310', bankName: 'ｼﾞｰｴﾑｵｰｱｵｿﾞﾗ' },
    ];
    const buf = buildZenginFile({ ...GOLDEN_INPUT, records });
    // 1 header + 3 data + 1 trailer + 1 end = 6 × 120 = 720 bytes
    expect(buf.byteLength).toBe(720);

    // Verify bank codes at correct offset in each data record
    // Data record layout: [0] kubun, [1-4] bankCode (4 bytes), ...
    const dataOffset = 120; // first data record starts at offset 120 (after header)
    expect(buf.slice(dataOffset + 1, dataOffset + 5).toString('ascii')).toBe('0001');
    expect(buf.slice(dataOffset + 121, dataOffset + 125).toString('ascii')).toBe('0005');
    expect(buf.slice(dataOffset + 241, dataOffset + 245).toString('ascii')).toBe('0310');
  });
});
