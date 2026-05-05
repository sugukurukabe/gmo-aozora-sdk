import { describe, it, expect } from 'vitest';
import { buildZenginFile, ZenginValidationError } from '../builder.js';
import type { ZenginFileInput, ZenginRecord } from '../types.js';

const REMITTER = {
  code: '1234567890',
  name: 'ｽｷﾞｸﾙ ｶﾌﾞｼｷｶｲｼｬ',
  bankCode: '0310',
  bankName: 'ｼﾞｰｴﾑｵｰｱｵｿﾞﾗ',
  branchCode: '001',
  branchName: 'ﾎﾝﾃﾝ',
  accountTypeCode: '1' as const,
  accountNumber: '1234567',
};

const makeRecord = (amount: bigint = BigInt(5800)): ZenginRecord => ({
  bankCode: '0001',
  bankName: 'ﾐｭｰｼﾞﾝｸﾞ',
  branchCode: '123',
  branchName: 'ｼﾝｼﾞｭｸ',
  accountTypeCode: '1',
  accountNumber: '1234567',
  beneficiaryName: 'ﾔﾏﾀﾞ ﾀﾛｳ',
  amount,
});

const BASE_INPUT: ZenginFileInput = {
  shorui: '11',
  transferDate: '0525',
  remitter: REMITTER,
  records: [makeRecord()],
};

describe('buildZenginFile', () => {
  it('1-record file is exactly 480 bytes (4 records × 120)', () => {
    const buf = buildZenginFile(BASE_INPUT);
    expect(buf.byteLength).toBe(480);
  });

  it('100-record file is exactly 12360 bytes (103 records × 120)', () => {
    const records = Array.from({ length: 100 }, (_, i) => makeRecord(BigInt((i + 1) * 1000)));
    const buf = buildZenginFile({ ...BASE_INPUT, records });
    expect(buf.byteLength).toBe(103 * 120);
  });

  it('shorui "12" (bonus) produces a valid file', () => {
    const buf = buildZenginFile({ ...BASE_INPUT, shorui: '12' });
    expect(buf.byteLength).toBe(480);
    // header byte 1 = '1', byte 2 = '2'
    expect(buf[1]).toBe(0x31);
    expect(buf[2]).toBe(0x32);
  });

  it('trailer total amount equals sum of all data record amounts', () => {
    const records = [makeRecord(BigInt(1000)), makeRecord(BigInt(2000)), makeRecord(BigInt(3000))];
    const buf = buildZenginFile({ ...BASE_INPUT, records });
    // trailer starts at offset (1 + 3) * 120 = 480
    const trailerOffset = 4 * 120;
    const amountSlice = buf.slice(trailerOffset + 7, trailerOffset + 19).toString('ascii');
    expect(amountSlice).toBe('000000006000');
  });

  it('trailer total count equals number of data records', () => {
    const records = [makeRecord(), makeRecord(), makeRecord()];
    const buf = buildZenginFile({ ...BASE_INPUT, records });
    const trailerOffset = 4 * 120;
    const countSlice = buf.slice(trailerOffset + 1, trailerOffset + 7).toString('ascii');
    expect(countSlice).toBe('000003');
  });

  it('last record (end) starts with "9"', () => {
    const buf = buildZenginFile(BASE_INPUT);
    const endOffset = 3 * 120; // header + 1 data + trailer = 3 records before end
    expect(buf[endOffset]).toBe(0x39); // '9'
  });

  it('throws ZenginValidationError for invalid shorui code', () => {
    const bad = { ...BASE_INPUT, shorui: '21' as never };
    expect(() => buildZenginFile(bad)).toThrow(ZenginValidationError);
  });

  it('throws ZenginValidationError for bankCode with wrong length', () => {
    const records = [{ ...makeRecord(), bankCode: '031' }]; // 3 digits instead of 4
    expect(() => buildZenginFile({ ...BASE_INPUT, records })).toThrow(ZenginValidationError);
  });

  it('throws ZenginValidationError for accountNumber with wrong length', () => {
    const records = [{ ...makeRecord(), accountNumber: '123456' }]; // 6 digits instead of 7
    expect(() => buildZenginFile({ ...BASE_INPUT, records })).toThrow(ZenginValidationError);
  });

  it('accepts string amounts in records', () => {
    const records = [{ ...makeRecord(), amount: '50000' }];
    const buf = buildZenginFile({ ...BASE_INPUT, records });
    expect(buf.byteLength).toBe(480);
  });
});
