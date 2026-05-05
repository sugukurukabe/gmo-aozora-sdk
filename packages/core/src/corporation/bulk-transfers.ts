import type { HttpClient } from '../http/client.js';
import { GmoAozoraTimeoutError } from '../errors/index.js';
import {
  BulkTransferCreateInputSchema,
  BulkTransferCreateResponseSchema,
  BulkTransferStatusResponseSchema,
  TransferResultResponseSchema,
  TransferGetResultParamsSchema,
  TransferGetStatusParamsSchema,
  TransferCancelInputSchema,
  TransferCancelResponseSchema,
  TransferFeeResponseSchema,
} from './schemas.js';
import type {
  BulkTransferCreateInput,
  BulkTransferCreateResponse,
  BulkTransferStatusResponse,
  TransferResultResponse,
  TransferGetResultParams,
  TransferGetStatusParams,
  TransferCancelInput,
  TransferCancelResponse,
  TransferFeeResponse,
} from './schemas.js';

export type PollResultOptions = {
  /** Max time to wait in milliseconds. Defaults to 60_000 (60 seconds). */
  timeoutMs?: number;
  /** Polling interval in milliseconds. Defaults to 3_000 (3 seconds). */
  intervalMs?: number;
};

/**
 * Corporation API: bulk transfers (`/bulktransfer/*`).
 *
 * Supports payroll-style batch transfers (総合振込) of up to 9,999 items.
 * The `pollResult` method is a production helper not available in the official SDKs.
 *
 * @see https://api.gmo-aozora.com/ganb/api/corporation/v1/bulktransfer/
 */
export class BulkTransfersApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * 総合振込依頼 — Submit a bulk transfer request.
   *
   * POST `/bulktransfer/request`
   *
   * When `resultCode === '2'` (未完了), use `pollResult` to wait for completion.
   */
  async create(input: BulkTransferCreateInput): Promise<BulkTransferCreateResponse> {
    const body = BulkTransferCreateInputSchema.parse(input);
    return this.http.post('/bulktransfer/request', {
      schema: BulkTransferCreateResponseSchema,
      body,
    });
  }

  /**
   * 総合振込状況照会 — Query the status / history of bulk transfers.
   *
   * GET `/bulktransfer/status`
   *
   * Returns a typed list of bulk transfer status items. Status code '30'
   * (一括振込結果確定済み) is bulk-specific and not present in single transfers.
   * Unknown sub-fields are preserved via `.passthrough()` at the item level.
   */
  async getStatus(params: TransferGetStatusParams): Promise<BulkTransferStatusResponse> {
    const parsed = TransferGetStatusParamsSchema.parse(params);
    const query: Record<string, string | undefined> = {
      accountId: parsed.accountId,
      queryKeyClass: parsed.queryKeyClass,
    };
    if (parsed.applyNo !== undefined) query['applyNo'] = parsed.applyNo;
    if (parsed.dateFrom !== undefined) query['dateFrom'] = parsed.dateFrom;
    if (parsed.dateTo !== undefined) query['dateTo'] = parsed.dateTo;
    if (parsed.nextItemKey !== undefined) query['nextItemKey'] = parsed.nextItemKey;

    return this.http.get('/bulktransfer/status', {
      schema: BulkTransferStatusResponseSchema,
      query,
    });
  }

  /**
   * 総合振込依頼結果照会 — Check the processing result for a given applyNo.
   *
   * GET `/bulktransfer/request-result`
   *
   * `resultCode`:
   *   - `'1'` = 完了 (completed)
   *   - `'2'` = 未完了 (still processing)
   *   - `'8'` = 期限切れ (expired)
   */
  async getResult(params: TransferGetResultParams): Promise<TransferResultResponse> {
    const parsed = TransferGetResultParamsSchema.parse(params);
    return this.http.get('/bulktransfer/request-result', {
      schema: TransferResultResponseSchema,
      query: {
        accountId: parsed.accountId,
        applyNo: parsed.applyNo,
      },
    });
  }

  /**
   * 総合振込手数料事前照会 — Estimate the fee before submitting.
   *
   * POST `/bulktransfer/transferfee`
   */
  async estimateFee(input: BulkTransferCreateInput): Promise<TransferFeeResponse> {
    const body = BulkTransferCreateInputSchema.parse(input);
    return this.http.post('/bulktransfer/transferfee', {
      schema: TransferFeeResponseSchema,
      body,
    });
  }

  /**
   * 総合振込取消依頼 — Cancel a pending bulk transfer.
   *
   * POST `/bulktransfer/cancel`
   *
   * `cancelTargetKeyClass`:
   *   - `'3'` = 総合振込申請取消 (ビジネスID管理利用, 申請中)
   *   - `'4'` = 総合振込受付取消 (予約中 / ビジネスID管理未利用)
   */
  async cancel(input: TransferCancelInput): Promise<TransferCancelResponse> {
    const body = TransferCancelInputSchema.parse(input);
    return this.http.post('/bulktransfer/cancel', {
      schema: TransferCancelResponseSchema,
      body,
    });
  }

  /**
   * Poll `/bulktransfer/request-result` until `resultCode !== '2'` or timeout.
   *
   * This production helper is not available in the official SDKs. It handles
   * the common pattern where `create` returns `resultCode === '2'` (still processing)
   * and the caller needs to wait for the final result.
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
