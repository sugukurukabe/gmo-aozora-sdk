import type { HttpClient } from '../http/client.js';
import { GmoAozoraTimeoutError } from '../errors/index.js';
import {
  TransferCreateInputSchema,
  TransferCreateResponseSchema,
  TransferResultResponseSchema,
  TransferGetResultParamsSchema,
  TransferGetStatusParamsSchema,
  TransferStatusResponseSchema,
  TransferCancelInputSchema,
  TransferCancelResponseSchema,
  TransferFeeResponseSchema,
} from './schemas.js';
import type {
  TransferCreateInput,
  TransferCreateResponse,
  TransferResultResponse,
  TransferGetResultParams,
  TransferGetStatusParams,
  TransferStatusResponse,
  TransferCancelInput,
  TransferCancelResponse,
  TransferFeeResponse,
} from './schemas.js';
import type { PollResultOptions } from './bulk-transfers.js';

/**
 * Corporation API: single transfers (`/transfer/*`).
 *
 * Supports up to 99 items per request (1 item = 通常振込, ≥2 items = 一括振込).
 *
 * @see https://api.gmo-aozora.com/ganb/api/corporation/v1/transfer/
 */
export class TransfersApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * 振込依頼 — Submit a single or batch transfer request (up to 99 items).
   *
   * POST `/transfer/request`
   */
  async create(input: TransferCreateInput): Promise<TransferCreateResponse> {
    const body = TransferCreateInputSchema.parse(input);
    return this.http.post('/transfer/request', {
      schema: TransferCreateResponseSchema,
      body,
    });
  }

  /**
   * 振込状況照会 — Query the status / history of transfers.
   *
   * GET `/transfer/status`
   *
   * Returns a typed list of transfer status items with literal `requestTransferStatus` codes.
   * Unknown sub-fields are preserved via `.passthrough()` at the item level.
   */
  async getStatus(params: TransferGetStatusParams): Promise<TransferStatusResponse> {
    const parsed = TransferGetStatusParamsSchema.parse(params);
    const query: Record<string, string | undefined> = {
      accountId: parsed.accountId,
      queryKeyClass: parsed.queryKeyClass,
    };
    if (parsed.applyNo !== undefined) query['applyNo'] = parsed.applyNo;
    if (parsed.dateFrom !== undefined) query['dateFrom'] = parsed.dateFrom;
    if (parsed.dateTo !== undefined) query['dateTo'] = parsed.dateTo;
    if (parsed.nextItemKey !== undefined) query['nextItemKey'] = parsed.nextItemKey;

    return this.http.get('/transfer/status', {
      schema: TransferStatusResponseSchema,
      query,
    });
  }

  /**
   * 振込依頼結果照会 — Poll the processing result for a given applyNo.
   *
   * GET `/transfer/request-result`
   *
   * `resultCode`:
   *   - `'1'` = 完了 (completed)
   *   - `'2'` = 未完了 (processing)
   *   - `'8'` = 期限切れ (expired)
   */
  async getResult(params: TransferGetResultParams): Promise<TransferResultResponse> {
    const parsed = TransferGetResultParamsSchema.parse(params);
    return this.http.get('/transfer/request-result', {
      schema: TransferResultResponseSchema,
      query: {
        accountId: parsed.accountId,
        applyNo: parsed.applyNo,
      },
    });
  }

  /**
   * 振込手数料事前照会 — Estimate the transfer fee before submitting.
   *
   * POST `/transfer/transferfee`
   */
  async estimateFee(input: TransferCreateInput): Promise<TransferFeeResponse> {
    const body = TransferCreateInputSchema.parse(input);
    return this.http.post('/transfer/transferfee', {
      schema: TransferFeeResponseSchema,
      body,
    });
  }

  /**
   * 振込取消依頼 — Cancel a pending transfer.
   *
   * POST `/transfer/cancel`
   *
   * `cancelTargetKeyClass`:
   *   - `'1'` = 振込申請取消 (ビジネスID管理利用, 申請中)
   *   - `'2'` = 振込受付取消 (予約中)
   */
  async cancel(input: TransferCancelInput): Promise<TransferCancelResponse> {
    const body = TransferCancelInputSchema.parse(input);
    return this.http.post('/transfer/cancel', {
      schema: TransferCancelResponseSchema,
      body,
    });
  }

  /**
   * Poll `/transfer/request-result` until `resultCode !== '2'` or timeout.
   *
   * This production helper mirrors `BulkTransfersApi.pollResult`.
   * Use when `create` returns `resultCode === '2'` (still processing).
   *
   * @throws {GmoAozoraTimeoutError} if the operation does not complete within `timeoutMs`.
   */
  async pollResult(
    params: TransferGetResultParams,
    opts: PollResultOptions = {},
  ): Promise<TransferResultResponse> {
    const timeoutMs = opts.timeoutMs ?? 60_000;
    const intervalMs = opts.intervalMs ?? 3_000;
    const deadline = Date.now() + timeoutMs;

    let result = await this.getResult(params);

    while (result.resultCode === '2') {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        throw new GmoAozoraTimeoutError({
          message: `pollResult timed out after ${timeoutMs}ms for applyNo=${params.applyNo}`,
        });
      }

      await new Promise<void>((resolve) => setTimeout(resolve, Math.min(intervalMs, remaining)));
      result = await this.getResult(params);
    }

    return result;
  }
}
