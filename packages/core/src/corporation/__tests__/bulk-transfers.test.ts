import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient } from '../../http/client.js';
import { BulkTransfersApi } from '../bulk-transfers.js';
import { BulkTransferRequestStatusCodeSchema } from '../schemas.js';
import { GmoAozoraApiError, GmoAozoraTimeoutError } from '../../errors/index.js';
import type { TokenSet } from '../../storage/index.js';

function makeTokenSet(): TokenSet {
  return {
    accessToken: 'tok',
    refreshToken: 'rtok',
    expiresAt: Date.now() + 3600_000,
    tokenType: 'Bearer',
    scope: 'private:transfer',
  };
}

function makeHttp() {
  return new HttpClient({
    baseUrl: 'https://sandbox.example.com',
    getAccessToken: () => Promise.resolve('tok'),
    refreshTokens: () => Promise.resolve(makeTokenSet()),
    maxRetries: 0,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

const sampleBulkItem = {
  itemId: '1',
  transferAmount: '50000',
  beneficiaryBankCode: '0310',
  beneficiaryBranchCode: '001',
  accountTypeCode: '1' as const,
  accountNumber: '1234567',
  beneficiaryName: 'YAMADA HANAKO',
};

const sampleCreateInput = {
  accountId: '123456789012',
  transferDesignatedDate: '2026-05-25',
  totalCount: '1',
  totalAmount: '50000',
  bulkTransfers: [sampleBulkItem],
};

const sampleCreateResponse = {
  accountId: '123456789012',
  resultCode: '1' as const,
  applyNo: '1234567890123456',
  applyEndDatetime: '2026-05-05T10:00:00+09:00',
};

const sampleResultResponse = {
  accountId: '123456789012',
  resultCode: '1' as const,
  applyNo: '1234567890123456',
  applyEndDatetime: '2026-05-05T10:00:00+09:00',
};

describe('BulkTransfersApi', () => {
  describe('create()', () => {
    it('submits bulk transfer and returns resultCode + applyNo', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(sampleCreateResponse), { status: 200 }),
      );

      const api = new BulkTransfersApi(makeHttp());
      const result = await api.create(sampleCreateInput);

      expect(result.resultCode).toBe('1');
      expect(result.applyNo).toHaveLength(16);
    });

    it('uses POST /bulktransfer/request', async () => {
      const fetchMock = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify(sampleCreateResponse), { status: 200 }));

      const api = new BulkTransfersApi(makeHttp());
      await api.create(sampleCreateInput);

      const url = (fetchMock.mock.calls[0]?.[0] as string) ?? '';
      expect(url).toContain('/bulktransfer/request');
      const init = fetchMock.mock.calls[0]?.[1];
      expect(init?.method).toBe('POST');
    });

    it('throws GmoAozoraApiError on 400 response', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ errorCode: 'E4000', errorMessage: 'Invalid request' }), {
          status: 400,
        }),
      );

      const api = new BulkTransfersApi(makeHttp());
      await expect(api.create(sampleCreateInput)).rejects.toBeInstanceOf(GmoAozoraApiError);
    });
  });

  describe('getResult()', () => {
    it('returns completed result', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(sampleResultResponse), { status: 200 }),
      );

      const api = new BulkTransfersApi(makeHttp());
      const result = await api.getResult({
        accountId: '123456789012',
        applyNo: '1234567890123456',
      });

      expect(result.resultCode).toBe('1');
    });

    it('uses GET /bulktransfer/request-result with query params', async () => {
      const fetchMock = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify(sampleResultResponse), { status: 200 }));

      const api = new BulkTransfersApi(makeHttp());
      await api.getResult({ accountId: '123456789012', applyNo: '1234567890123456' });

      const url = (fetchMock.mock.calls[0]?.[0] as string) ?? '';
      expect(url).toContain('/bulktransfer/request-result');
      expect(url).toContain('accountId=123456789012');
    });
  });

  describe('cancel()', () => {
    it('cancels bulk transfer with cancelTargetKeyClass=4', async () => {
      const cancelResponse = {
        accountId: '123456789012',
        resultCode: '1' as const,
        applyNo: '1234567890123456',
        applyEndDatetime: '2026-05-05T10:00:00+09:00',
      };

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(cancelResponse), { status: 200 }),
      );

      const api = new BulkTransfersApi(makeHttp());
      const result = await api.cancel({
        accountId: '123456789012',
        cancelTargetKeyClass: '4',
        applyNo: '1234567890123456',
      });

      expect(result.resultCode).toBe('1');
    });
  });

  describe('pollResult()', () => {
    it('returns immediately when resultCode is already 1 (completed)', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(sampleResultResponse), { status: 200 }),
      );

      const api = new BulkTransfersApi(makeHttp());
      const result = await api.pollResult(
        { accountId: '123456789012', applyNo: '1234567890123456' },
        { intervalMs: 10 },
      );

      expect(result.resultCode).toBe('1');
    });

    it('polls until resultCode transitions from 2 to 1', async () => {
      const fetchMock = vi
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              ...sampleResultResponse,
              resultCode: '2',
              applyEndDatetime: undefined,
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              ...sampleResultResponse,
              resultCode: '2',
              applyEndDatetime: undefined,
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValue(new Response(JSON.stringify(sampleResultResponse), { status: 200 }));

      const api = new BulkTransfersApi(makeHttp());
      const result = await api.pollResult(
        { accountId: '123456789012', applyNo: '1234567890123456' },
        { intervalMs: 10, timeoutMs: 5000 },
      );

      expect(result.resultCode).toBe('1');
      expect(fetchMock.mock.calls.length).toBe(3);
    });

    it('throws GmoAozoraTimeoutError when timeout is exceeded', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              ...sampleResultResponse,
              resultCode: '2',
              applyEndDatetime: undefined,
            }),
            { status: 200 },
          ),
        ),
      );

      const api = new BulkTransfersApi(makeHttp());
      await expect(
        api.pollResult(
          { accountId: '123456789012', applyNo: '1234567890123456' },
          { intervalMs: 10, timeoutMs: 50 },
        ),
      ).rejects.toBeInstanceOf(GmoAozoraTimeoutError);
    });

    it('returns immediately for resultCode=8 (expired) without further polling', async () => {
      const expiredResponse = {
        ...sampleResultResponse,
        resultCode: '8' as const,
        applyEndDatetime: undefined,
      };

      const fetchMock = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify(expiredResponse), { status: 200 }));

      const api = new BulkTransfersApi(makeHttp());
      const result = await api.pollResult(
        { accountId: '123456789012', applyNo: '1234567890123456' },
        { intervalMs: 10 },
      );

      expect(result.resultCode).toBe('8');
      expect(fetchMock.mock.calls.length).toBe(1);
    });
  });

  describe('getStatus()', () => {
    it('returns typed BulkTransferStatusResponse with literal status codes', async () => {
      const statusResponse = {
        accountId: '123456789012',
        transferStatusList: [
          {
            applyNo: '1234567890123456',
            requestTransferStatus: '30', // bulk-specific: 一括振込結果確定済み
            transferDesignatedDate: '2026-05-25',
          },
        ],
      };

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(statusResponse), { status: 200 }),
      );

      const api = new BulkTransfersApi(makeHttp());
      const result = await api.getStatus({
        accountId: '123456789012',
        queryKeyClass: '2',
      });

      expect(result.accountId).toBe('123456789012');
      expect(result.transferStatusList?.[0]?.requestTransferStatus).toBe('30');
    });

    it('accepts all documented bulk transfer status codes', () => {
      const validCodes = ['2', '3', '4', '5', '8', '11', '12', '13', '20', '30', '40'];
      for (const code of validCodes) {
        expect(BulkTransferRequestStatusCodeSchema.safeParse(code).success).toBe(true);
      }
    });

    it('rejects status code 22 which is single-transfer only (not in bulk union)', () => {
      // '22' and '24', '25', '26' are only in single transfer status codes
      expect(BulkTransferRequestStatusCodeSchema.safeParse('22').success).toBe(false);
    });
  });

  describe('estimateFee()', () => {
    it('returns bulk transfer fee estimate', async () => {
      const feeResponse = {
        accountId: '123456789012',
        baseDate: '2026-05-05',
        baseTime: '10:00:00+09:00',
        totalFee: '330',
        transferFeeDetails: [{ itemId: '1', transferFee: '330' }],
      };

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(feeResponse), { status: 200 }),
      );

      const api = new BulkTransfersApi(makeHttp());
      const result = await api.estimateFee(sampleCreateInput);

      expect(result.totalFee).toBe('330');
    });
  });
});
