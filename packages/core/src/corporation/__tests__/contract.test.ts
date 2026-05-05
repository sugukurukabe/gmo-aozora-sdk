/**
 * API contract fixture tests for @sugukuru/gmo-aozora-sdk corporation schemas.
 *
 * These tests validate that our Zod schemas correctly parse realistic GMO Aozora
 * API response shapes. JSON fixtures represent the expected API response format.
 *
 * NOTE(spec-confirm): Fixtures are based on available documentation (PDF spec v2508,
 * official SDK model inspection). Validate against real Sunabar responses before v1.0.
 */
import { describe, it, expect } from 'vitest';
import {
  AccountSchema,
  BalanceSchema,
  TransactionSchema,
  VirtualAccountSchema,
  TransferCreateResponseSchema,
  TransferResultResponseSchema,
  TransferStatusResponseSchema,
  BulkTransferCreateResponseSchema,
  BulkTransferStatusResponseSchema,
} from '../schemas.js';

// ---------------------------------------------------------------------------
// Account fixtures
// ---------------------------------------------------------------------------

describe('AccountSchema contract fixture', () => {
  const fixture = {
    accountId: '123456789012',
    accountName: 'テスト普通預金',
    bankCode: '0310',
    branchCode: '001',
    accountType: '1',
    accountNumber: '1234567',
    currency: 'JPY',
  };

  it('accepts a realistic account response', () => {
    const result = AccountSchema.safeParse(fixture);
    expect(result.success).toBe(true);
  });

  it('accepts actual Sunabar response shape (confirmed from live API 2026-05-05)', () => {
    // This fixture was derived from a real Sunabar API response.
    // bankCode and accountType are absent — Sunabar returns accountTypeCode/accountTypeName instead.
    const sunabarShape = {
      accountId: '0013666',
      accountName: 'テスト法人口座',
      branchCode: '001',
      accountNumber: '1234567',
      branchName: '本店',
      accountTypeCode: '1',
      accountTypeName: '普通',
      primaryAccountCode: '001',
      primaryAccountCodeName: '普通預金',
      accountNameKana: 'ﾃｽﾄ',
      currencyCode: 'JPY',
      currencyName: '円',
      transferLimitAmount: '10000000',
    };
    const result = AccountSchema.safeParse(sunabarShape);
    expect(result.success).toBe(true);
  });

  it('accepts account without optional currency field', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { currency: _currency, ...minimal } = fixture;
    const result = AccountSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it('accepts extra fields (passthrough schema — forward-compatible with live API)', () => {
    // AccountSchema uses .passthrough() because the live Sunabar API returns
    // additional fields (branchName, accountTypeCode, etc.) that are not yet
    // documented in the spec. Strict mode would break on real API responses.
    const withExtra = { ...fixture, futureField: 'value' };
    const result = AccountSchema.safeParse(withExtra);
    expect(result.success).toBe(true);
  });

  it('rejects missing required accountNumber', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { accountNumber: _accountNumber, ...missing } = fixture;
    expect(AccountSchema.safeParse(missing).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Balance fixtures
// ---------------------------------------------------------------------------

describe('BalanceSchema contract fixture', () => {
  const fixture = {
    accountId: '123456789012',
    bookBalance: '1500000',
    availableBalance: '1450000',
    balanceDate: '2026-05-05',
  };

  it('accepts a realistic balance response', () => {
    const result = BalanceSchema.safeParse(fixture);
    expect(result.success).toBe(true);
  });

  it('amounts are strings (never numbers)', () => {
    const bad = { ...fixture, bookBalance: 1500000 };
    const result = BalanceSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Transaction fixtures
// ---------------------------------------------------------------------------

describe('TransactionSchema contract fixture', () => {
  const fixture = {
    transactionId: 'TXN20260505001',
    transactionDate: '2026-05-05',
    transactionType: '1',
    amount: '5800',
    balance: '1494200',
    description: '振込入金',
    counterpartyName: 'ｽｸﾞｸﾙ ｶﾌﾞｼｷｶﾞｲｼｬ',
    counterpartyAccountNumber: '1234567',
  };

  it('accepts a realistic transaction response', () => {
    const result = TransactionSchema.safeParse(fixture);
    expect(result.success).toBe(true);
  });

  it('accepts transaction without optional fields', () => {
    const minimal = {
      transactionId: 'TXN20260505001',
      transactionDate: '2026-05-05',
      transactionType: '1',
      amount: '5800',
      balance: '1494200',
    };
    const result = TransactionSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it('passes through unknown fields (passthrough for pre-Sunabar resilience)', () => {
    const withExtra = { ...fixture, trnSeq: '0001', internalCode: 'X' };
    const result = TransactionSchema.safeParse(withExtra);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Virtual Account fixtures
// ---------------------------------------------------------------------------

describe('VirtualAccountSchema contract fixture', () => {
  const fixture = {
    virtualAccountId: 'VA001234567890',
    accountId: '123456789012',
    virtualAccountNumber: '9876543',
    status: 'ACTIVE' as const,
    label: 'テスト仮想口座',
    createdAt: '2026-01-01T00:00:00+09:00',
  };

  it('accepts a realistic virtual account response', () => {
    const result = VirtualAccountSchema.safeParse(fixture);
    expect(result.success).toBe(true);
  });

  it('accepts virtual account without optional label', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { label: _label, ...minimal } = fixture;
    const result = VirtualAccountSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it('accepts all known status values', () => {
    const statuses = ['ACTIVE', 'INACTIVE', 'CLOSED'] as const;
    for (const status of statuses) {
      expect(VirtualAccountSchema.safeParse({ ...fixture, status }).success).toBe(true);
    }
  });

  it('rejects unknown status values (strict enum, needs Sunabar confirmation)', () => {
    // VirtualAccountStatusSchema is a strict enum — 'SUSPENDED' is not documented
    // If GMO adds a new status, we'll need to extend the enum. Marked NEEDS-SUNABAR-VALIDATION.
    const withUnknownStatus = { ...fixture, status: 'SUSPENDED' };
    expect(VirtualAccountSchema.safeParse(withUnknownStatus).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Transfer fixtures
// ---------------------------------------------------------------------------

describe('TransferCreateResponseSchema contract fixture', () => {
  it('accepts resultCode 1 (completed)', () => {
    const fixture = {
      accountId: '123456789012',
      resultCode: '1' as const,
      applyNo: '1234567890123456',
      applyEndDatetime: '2026-05-05T12:00:00+09:00',
    };
    expect(TransferCreateResponseSchema.safeParse(fixture).success).toBe(true);
  });

  it('accepts resultCode 2 (processing — needs pollResult)', () => {
    const fixture = {
      accountId: '123456789012',
      resultCode: '2' as const,
      applyNo: '1234567890123456',
    };
    expect(TransferCreateResponseSchema.safeParse(fixture).success).toBe(true);
  });

  it('rejects unknown resultCode', () => {
    const bad = {
      accountId: '123456789012',
      resultCode: '9',
      applyNo: '1234567890123456',
    };
    expect(TransferCreateResponseSchema.safeParse(bad).success).toBe(false);
  });
});

describe('TransferResultResponseSchema contract fixture', () => {
  const fixture = {
    accountId: '123456789012',
    resultCode: '1' as const,
    applyNo: '1234567890123456',
    applyEndDatetime: '2026-05-05T12:00:00+09:00',
  };

  it('accepts a completed transfer result', () => {
    expect(TransferResultResponseSchema.safeParse(fixture).success).toBe(true);
  });

  it('accepts expired result (resultCode 8)', () => {
    const expired = { ...fixture, resultCode: '8' as const };
    expect(TransferResultResponseSchema.safeParse(expired).success).toBe(true);
  });
});

describe('TransferStatusResponseSchema contract fixture', () => {
  const fixture = {
    accountId: '123456789012',
    transferStatusList: [
      {
        applyNo: '1234567890123456',
        requestTransferStatus: '24' as const,
        totalTransferAmount: '5800',
        totalTransferCount: '1',
        transferDatetime: '2026-05-05T12:00:00+09:00',
      },
    ],
  };

  it('accepts a realistic transfer status list', () => {
    expect(TransferStatusResponseSchema.safeParse(fixture).success).toBe(true);
  });

  it('accepts response with nextItemKey for pagination', () => {
    const paginated = { ...fixture, nextItemKey: 'TOKEN_ABC' };
    expect(TransferStatusResponseSchema.safeParse(paginated).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Bulk transfer fixtures
// ---------------------------------------------------------------------------

describe('BulkTransferCreateResponseSchema contract fixture', () => {
  it('accepts resultCode 2 (processing — typical for bulk)', () => {
    const fixture = {
      accountId: '123456789012',
      resultCode: '2' as const,
      applyNo: '9876543210123456',
    };
    expect(BulkTransferCreateResponseSchema.safeParse(fixture).success).toBe(true);
  });
});

describe('BulkTransferStatusResponseSchema contract fixture', () => {
  const fixture = {
    accountId: '123456789012',
    transferStatusList: [
      {
        applyNo: '9876543210123456',
        // Bulk transfer uses '20' = 振込依頼済み (different from single transfer '24')
        requestTransferStatus: '20' as const,
        transferDesignatedDate: '2026-05-25',
        applyDatetime: '2026-05-05T12:00:00+09:00',
      },
    ],
  };

  it('accepts a realistic bulk transfer status response', () => {
    expect(BulkTransferStatusResponseSchema.safeParse(fixture).success).toBe(true);
  });

  it('accepts bulk-specific status code 30 (一括振込結果確定済み)', () => {
    const withCode30 = {
      ...fixture,
      transferStatusList: [{ applyNo: '9876543210123456', requestTransferStatus: '30' as const }],
    };
    expect(BulkTransferStatusResponseSchema.safeParse(withCode30).success).toBe(true);
  });

  it('rejects single-transfer-only status code 24', () => {
    const bad = {
      ...fixture,
      transferStatusList: [{ applyNo: '9876543210123456', requestTransferStatus: '24' }],
    };
    expect(BulkTransferStatusResponseSchema.safeParse(bad).success).toBe(false);
  });
});
