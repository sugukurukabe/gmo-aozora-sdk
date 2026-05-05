import { describe, it, expect } from 'vitest';
import { buildHeaderRecord } from '../records/header.js';
import { buildDataRecord } from '../records/data.js';
import { buildTrailerRecord } from '../records/trailer.js';
import { buildEndRecord } from '../records/end.js';
import type { ZenginFileInput, ZenginRecord } from '../types.js';

const SAMPLE_INPUT: ZenginFileInput = {
  shorui: '11',
  transferDate: '0525',
  remitter: {
    code: '1234567890',
    name: 'ｽｷﾞｸﾙ ｶﾌﾞｼｷｶｲｼｬ',
    bankCode: '0310',
    bankName: 'ｼﾞｰｴﾑｵｰｱｵｿﾞﾗ',
    branchCode: '001',
    branchName: 'ﾎﾝﾃﾝ',
    accountTypeCode: '1',
    accountNumber: '1234567',
  },
  records: [],
};

const SAMPLE_RECORD: ZenginRecord = {
  bankCode: '0001',
  bankName: 'ﾐｭｰｼﾞﾝｸﾞ',
  branchCode: '001',
  branchName: 'ｼﾝｼﾞｭｸ',
  accountTypeCode: '1',
  accountNumber: '1234567',
  beneficiaryName: 'ﾔﾏﾀﾞ ﾀﾛｳ',
  amount: BigInt(5000),
};

describe('buildHeaderRecord', () => {
  it('produces exactly 120 bytes', () => {
    const buf = buildHeaderRecord(SAMPLE_INPUT);
    expect(buf.byteLength).toBe(120);
  });

  it('starts with レコード区分 "1"', () => {
    const buf = buildHeaderRecord(SAMPLE_INPUT);
    expect(buf[0]).toBe(0x31); // '1'
  });

  it('encodes shorui at bytes 2-3', () => {
    const buf = buildHeaderRecord(SAMPLE_INPUT);
    // bytes 1-2 (0-indexed) = '1', '1'
    expect(buf[1]).toBe(0x31);
    expect(buf[2]).toBe(0x31);
  });

  it('encodes shorui "12" correctly for bonus', () => {
    const buf = buildHeaderRecord({ ...SAMPLE_INPUT, shorui: '12' });
    expect(buf[1]).toBe(0x31); // '1'
    expect(buf[2]).toBe(0x32); // '2'
  });

  it('accepts YYYYMMDD format for transferDate', () => {
    const buf = buildHeaderRecord({ ...SAMPLE_INPUT, transferDate: '20260525' });
    expect(buf.byteLength).toBe(120);
    // bytes 54-57 (0-indexed) = '0525'
    expect(buf[54]).toBe(0x30); // '0'
    expect(buf[55]).toBe(0x35); // '5'
  });
});

describe('buildDataRecord', () => {
  it('produces exactly 120 bytes', () => {
    const buf = buildDataRecord(SAMPLE_RECORD);
    expect(buf.byteLength).toBe(120);
  });

  it('starts with レコード区分 "2"', () => {
    const buf = buildDataRecord(SAMPLE_RECORD);
    expect(buf[0]).toBe(0x32); // '2'
  });

  it('encodes amount at correct byte offset (76-85)', () => {
    const buf = buildDataRecord({ ...SAMPLE_RECORD, amount: BigInt(100000) });
    // bytes 76-85 (0-indexed): zero-padded 10 digits → '0000100000'
    const amountStr = buf.slice(76, 86).toString('ascii');
    expect(amountStr).toBe('0000100000');
  });

  it('handles string amount correctly', () => {
    const buf = buildDataRecord({ ...SAMPLE_RECORD, amount: '50000' });
    const amountStr = buf.slice(76, 86).toString('ascii');
    expect(amountStr).toBe('0000050000');
  });

  it('encodes bank code at bytes 1-4 (0-indexed)', () => {
    const buf = buildDataRecord(SAMPLE_RECORD);
    const bankCode = buf.slice(1, 5).toString('ascii');
    expect(bankCode).toBe('0001');
  });
});

describe('buildTrailerRecord', () => {
  it('produces exactly 120 bytes', () => {
    const buf = buildTrailerRecord(10, BigInt(500000));
    expect(buf.byteLength).toBe(120);
  });

  it('starts with レコード区分 "8"', () => {
    const buf = buildTrailerRecord(10, BigInt(500000));
    expect(buf[0]).toBe(0x38); // '8'
  });

  it('encodes total count at bytes 1-6 (0-indexed)', () => {
    const buf = buildTrailerRecord(42, BigInt(0));
    const count = buf.slice(1, 7).toString('ascii');
    expect(count).toBe('000042');
  });

  it('encodes total amount at bytes 7-18 (0-indexed)', () => {
    const buf = buildTrailerRecord(1, BigInt(123456789));
    const amount = buf.slice(7, 19).toString('ascii');
    expect(amount).toBe('000123456789');
  });
});

describe('buildEndRecord', () => {
  it('produces exactly 120 bytes', () => {
    const buf = buildEndRecord();
    expect(buf.byteLength).toBe(120);
  });

  it('starts with レコード区分 "9"', () => {
    const buf = buildEndRecord();
    expect(buf[0]).toBe(0x39); // '9'
  });

  it('remaining bytes are all spaces', () => {
    const buf = buildEndRecord();
    for (let i = 1; i < 120; i++) {
      expect(buf[i]).toBe(0x20);
    }
  });
});
