import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient } from '../../http/client.js';
import { TransfersApi } from '../transfers.js';
import { TransferStatusItemSchema, TransferRequestStatusCodeSchema } from '../schemas.js';
import { GmoAozoraApiError } from '../../errors/index.js';
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

const sampleTransferItem = {
  itemId: '1',
  transferAmount: '50000',
  beneficiaryBankCode: '0310',
  beneficiaryBranchCode: '001',
  accountTypeCode: '1' as const,
  accountNumber: '1234567',
  beneficiaryName: 'TANAKA TARO',
};

const sampleCreateInput = {
  accountId: '123456789012',
  transferDesignatedDate: '2026-05-15',
  transfers: [sampleTransferItem],
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

describe('TransfersApi', () => {
  describe('create()', () => {
    it('submits transfer request and returns response with resultCode and applyNo', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(sampleCreateResponse), { status: 200 }),
      );

      const api = new TransfersApi(makeHttp());
      const result = await api.create(sampleCreateInput);

      expect(result.resultCode).toBe('1');
      expect(result.applyNo).toBe('1234567890123456');
      expect(result.applyEndDatetime).toBeDefined();
    });

    it('returns resultCode=2 when processing is incomplete', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({ ...sampleCreateResponse, resultCode: '2', applyEndDatetime: undefined }),
          { status: 200 },
        ),
      );

      const api = new TransfersApi(makeHttp());
      const result = await api.create(sampleCreateInput);

      expect(result.resultCode).toBe('2');
      expect(result.applyEndDatetime).toBeUndefined();
    });

    it('throws GmoAozoraApiError on 400 response', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ errorCode: 'E4000', errorMessage: 'Invalid request' }), {
          status: 400,
        }),
      );

      const api = new TransfersApi(makeHttp());
      await expect(api.create(sampleCreateInput)).rejects.toBeInstanceOf(GmoAozoraApiError);
    });

    it('uses POST /transfer/request path', async () => {
      const fetchMock = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify(sampleCreateResponse), { status: 200 }));

      const api = new TransfersApi(makeHttp());
      await api.create(sampleCreateInput);

      const url = (fetchMock.mock.calls[0]?.[0] as string) ?? '';
      expect(url).toContain('/transfer/request');
      const init = fetchMock.mock.calls[0]?.[1];
      expect(init?.method).toBe('POST');
    });
  });

  describe('getResult()', () => {
    it('returns completed result with resultCode=1', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(sampleResultResponse), { status: 200 }),
      );

      const api = new TransfersApi(makeHttp());
      const result = await api.getResult({
        accountId: '123456789012',
        applyNo: '1234567890123456',
      });

      expect(result.resultCode).toBe('1');
    });

    it('returns resultCode=8 for expired request', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({ ...sampleResultResponse, resultCode: '8', applyEndDatetime: undefined }),
          { status: 200 },
        ),
      );

      const api = new TransfersApi(makeHttp());
      const result = await api.getResult({
        accountId: '123456789012',
        applyNo: '1234567890123456',
      });

      expect(result.resultCode).toBe('8');
    });

    it('uses GET /transfer/request-result with query params', async () => {
      const fetchMock = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify(sampleResultResponse), { status: 200 }));

      const api = new TransfersApi(makeHttp());
      await api.getResult({ accountId: '123456789012', applyNo: '1234567890123456' });

      const url = (fetchMock.mock.calls[0]?.[0] as string) ?? '';
      expect(url).toContain('/transfer/request-result');
      expect(url).toContain('accountId=123456789012');
      expect(url).toContain('applyNo=1234567890123456');
    });
  });

  describe('estimateFee()', () => {
    it('returns fee estimate with totalFee', async () => {
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

      const api = new TransfersApi(makeHttp());
      const result = await api.estimateFee(sampleCreateInput);

      expect(result.totalFee).toBe('330');
      expect(result.transferFeeDetails).toHaveLength(1);
    });
  });

  describe('getStatus()', () => {
    it('returns typed TransferStatusResponse with literal status codes', async () => {
      const statusResponse = {
        accountId: '123456789012',
        transferStatusList: [
          {
            applyNo: '1234567890123456',
            requestTransferStatus: '24',
            transferDesignatedDate: '2026-05-25',
            applyDatetime: '2026-05-05T10:00:00+09:00',
          },
        ],
      };

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(statusResponse), { status: 200 }),
      );

      const api = new TransfersApi(makeHttp());
      const result = await api.getStatus({
        accountId: '123456789012',
        queryKeyClass: '1',
        applyNo: '1234567890123456',
      });

      expect(result.accountId).toBe('123456789012');
      expect(result.transferStatusList).toHaveLength(1);
      expect(result.transferStatusList[0]?.requestTransferStatus).toBe('24');
    });

    it('rejects invalid requestTransferStatus code in schema', () => {
      const invalid = {
        applyNo: '1234567890123456',
        requestTransferStatus: '99', // not in the literal union
      };
      expect(TransferStatusItemSchema.safeParse(invalid).success).toBe(false);
    });

    it('accepts all documented transfer status codes', () => {
      const validCodes = [
        '2',
        '3',
        '4',
        '5',
        '8',
        '11',
        '12',
        '13',
        '20',
        '22',
        '24',
        '25',
        '26',
        '40',
      ];
      for (const code of validCodes) {
        expect(TransferRequestStatusCodeSchema.safeParse(code).success).toBe(true);
      }
    });
  });

  describe('cancel()', () => {
    it('cancels a transfer and returns response', async () => {
      const cancelResponse = {
        accountId: '123456789012',
        resultCode: '1' as const,
        applyNo: '1234567890123456',
        applyEndDatetime: '2026-05-05T10:00:00+09:00',
      };

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(cancelResponse), { status: 200 }),
      );

      const api = new TransfersApi(makeHttp());
      const result = await api.cancel({
        accountId: '123456789012',
        cancelTargetKeyClass: '2',
        applyNo: '1234567890123456',
      });

      expect(result.resultCode).toBe('1');
    });
  });

  describe('pollResult()', () => {
    const params = { accountId: '123456789012', applyNo: '1234567890123456' };

    it('returns immediately when resultCode is not 2 (complete)', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            accountId: '123456789012',
            resultCode: '1',
            applyNo: '1234567890123456',
          }),
          { status: 200 },
        ),
      );

      const api = new TransfersApi(makeHttp());
      const result = await api.pollResult(params);
      expect(result.resultCode).toBe('1');
    });

    it('returns immediately when resultCode is 8 (expired)', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            accountId: '123456789012',
            resultCode: '8',
            applyNo: '1234567890123456',
          }),
          { status: 200 },
        ),
      );

      const api = new TransfersApi(makeHttp());
      const result = await api.pollResult(params, { timeoutMs: 5_000 });
      expect(result.resultCode).toBe('8');
    });

    it('polls until resultCode transitions from 2 to 1', async () => {
      let calls = 0;
      vi.spyOn(global, 'fetch').mockImplementation(() => {
        calls++;
        const rc = calls < 2 ? '2' : '1';
        return Promise.resolve(
          new Response(
            JSON.stringify({
              accountId: '123456789012',
              resultCode: rc,
              applyNo: '1234567890123456',
            }),
            { status: 200 },
          ),
        );
      });

      const api = new TransfersApi(makeHttp());
      const result = await api.pollResult(params, { intervalMs: 1, timeoutMs: 5_000 });
      expect(result.resultCode).toBe('1');
      expect(calls).toBe(2);
    });

    it('throws GmoAozoraTimeoutError when timeout is exceeded', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              accountId: '123456789012',
              resultCode: '2',
              applyNo: '1234567890123456',
            }),
            { status: 200 },
          ),
        ),
      );

      const { GmoAozoraTimeoutError } = await import('../../errors/index.js');
      const api = new TransfersApi(makeHttp());
      await expect(api.pollResult(params, { intervalMs: 1, timeoutMs: 5 })).rejects.toBeInstanceOf(
        GmoAozoraTimeoutError,
      );
    });
  });
});
