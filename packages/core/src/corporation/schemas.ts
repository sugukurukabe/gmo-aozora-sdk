import { z } from 'zod';

// ─── Account ─────────────────────────────────────────────────────────────────

export const AccountSchema = z
  .object({
    accountId: z.string(),
    accountName: z.string(),
    branchCode: z.string(),
    accountNumber: z.string(),
    // bankCode / accountType are returned in production but omitted in Sunabar.
    bankCode: z.string().optional(),
    accountType: z.string().optional(),
    // Fields returned by Sunabar (confirmed from live API response).
    branchName: z.string().optional(),
    accountTypeCode: z.string().optional(),
    accountTypeName: z.string().optional(),
    primaryAccountCode: z.string().optional(),
    primaryAccountCodeName: z.string().optional(),
    accountNameKana: z.string().optional(),
    currencyCode: z.string().optional(),
    currencyName: z.string().optional(),
    currency: z.string().optional(),
    transferLimitAmount: z.string().optional(),
  })
  .passthrough();

export type Account = z.infer<typeof AccountSchema>;

export const GetAccountsResponseSchema = z
  .object({
    accounts: z.array(AccountSchema),
    // Returned by Sunabar at root level (confirmed from live API response).
    baseDate: z.string().optional(),
    baseTime: z.string().optional(),
  })
  .passthrough();

export type GetAccountsResponse = z.infer<typeof GetAccountsResponseSchema>;

// ─── Balance ──────────────────────────────────────────────────────────────────

export const BalanceSchema = z
  .object({
    accountId: z.string(),
    /** Monetary amount as string — use parseAmount() to convert to bigint. */
    bookBalance: z.string().optional(),
    availableBalance: z.string().optional(),
    balanceDate: z.string().optional(),
    // Sunabar-specific field names (confirmed from live API 2026-05-05)
    balance: z.string().optional(),
    withdrawableAmount: z.string().optional(),
    previousDayBalance: z.string().optional(),
    previousMonthBalance: z.string().optional(),
  })
  .passthrough();

export type Balance = z.infer<typeof BalanceSchema>;

export const GetBalancesResponseSchema = z
  .object({
    balances: z.array(BalanceSchema),
    baseDate: z.string().optional(),
    baseTime: z.string().optional(),
  })
  .passthrough();

export type GetBalancesResponse = z.infer<typeof GetBalancesResponseSchema>;

// ─── Transaction ──────────────────────────────────────────────────────────────

export const TransactionSchema = z
  .object({
    transactionId: z.string(),
    transactionDate: z.string(),
    transactionType: z.string(),
    /** String amount — use parseAmount(). */
    amount: z.string(),
    balance: z.string(),
    description: z.string().optional(),
    counterpartyName: z.string().optional(),
    counterpartyAccountNumber: z.string().optional(),
  })
  .passthrough();

export type Transaction = z.infer<typeof TransactionSchema>;

export const GetTransactionsResponseSchema = z
  .object({
    transactions: z.array(TransactionSchema),
    nextItemKey: z.string().optional(),
  })
  .passthrough();

export type GetTransactionsResponse = z.infer<typeof GetTransactionsResponseSchema>;

export const TransactionParamsSchema = z.object({
  accountId: z.string(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  nextItemKey: z.string().optional(),
});

export type TransactionParams = z.infer<typeof TransactionParamsSchema>;

// ─── Virtual Account ─────────────────────────────────────────────────────────

export const VirtualAccountStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'CLOSED']);
export type VirtualAccountStatus = z.infer<typeof VirtualAccountStatusSchema>;

export const VirtualAccountSchema = z
  .object({
    virtualAccountId: z.string(),
    accountId: z.string(),
    virtualAccountNumber: z.string(),
    status: VirtualAccountStatusSchema,
    label: z.string().optional(),
    createdAt: z.string(),
  })
  .strict();

export type VirtualAccount = z.infer<typeof VirtualAccountSchema>;

export const GetVirtualAccountsResponseSchema = z
  .object({
    virtualAccounts: z.array(VirtualAccountSchema),
    nextItemKey: z.string().optional(),
  })
  .strict();

export type GetVirtualAccountsResponse = z.infer<typeof GetVirtualAccountsResponseSchema>;

export const CreateVirtualAccountInputSchema = z.object({
  accountId: z.string(),
  label: z.string().optional(),
});

export type CreateVirtualAccountInput = z.infer<typeof CreateVirtualAccountInputSchema>;

export const CreateVirtualAccountResponseSchema = z
  .object({
    virtualAccount: VirtualAccountSchema,
  })
  .strict();

export type CreateVirtualAccountResponse = z.infer<typeof CreateVirtualAccountResponseSchema>;

export const UpdateVirtualAccountStatusResponseSchema = z
  .object({
    virtualAccount: VirtualAccountSchema,
  })
  .strict();

export type UpdateVirtualAccountStatusResponse = z.infer<
  typeof UpdateVirtualAccountStatusResponseSchema
>;

// ─── Transfer ─────────────────────────────────────────────────────────────────

/** 科目コード: 1=普通, 2=当座, 4=貯蓄, 9=その他 */
export const AccountTypeCodeSchema = z.enum(['1', '2', '4', '9']);
export type AccountTypeCode = z.infer<typeof AccountTypeCodeSchema>;

/** 振込指定日休日コード: 1=翌営業日, 2=前営業日, 3=エラー返却 */
export const TransferDateHolidayCodeSchema = z.enum(['1', '2', '3']);
export type TransferDateHolidayCode = z.infer<typeof TransferDateHolidayCodeSchema>;

/** Per-item transfer detail (振込情報). */
export const TransferItemSchema = z
  .object({
    /** 明細番号 — optional for single-item requests. */
    itemId: z.string().optional(),
    /** 振込金額 — numeric string, use parseAmount() to convert. */
    transferAmount: z.string(),
    /** EDI情報 — optional. */
    ediInfo: z.string().optional(),
    /** 被仕向金融機関番号 — exactly 4 digits. */
    beneficiaryBankCode: z.string().length(4),
    /** 被仕向金融機関名カナ — reference only, not used for processing. */
    beneficiaryBankName: z.string().optional(),
    /** 被仕向支店番号 — exactly 3 digits. */
    beneficiaryBranchCode: z.string().length(3),
    /** 被仕向支店名カナ — reference only. */
    beneficiaryBranchName: z.string().optional(),
    /** 科目コード (預金種別). */
    accountTypeCode: AccountTypeCodeSchema,
    /** 口座番号 — exactly 7 digits, zero-padded. */
    accountNumber: z.string().length(7),
    /** 受取人名. */
    beneficiaryName: z.string(),
  })
  .strict();

export type TransferItem = z.infer<typeof TransferItemSchema>;

export const TransferCreateInputSchema = z.object({
  /** 口座ID. */
  accountId: z.string(),
  /** 振込依頼人名 — defaults to account holder name if omitted. */
  remitterName: z.string().optional(),
  /** 振込指定日 YYYY-MM-DD. */
  transferDesignatedDate: z.string(),
  /** 振込指定日休日コード — defaults to '1' (翌営業日) if omitted. */
  transferDateHolidayCode: TransferDateHolidayCodeSchema.optional(),
  /** 合計件数 — required when transfers.length >= 2. */
  totalCount: z.string().optional(),
  /** 合計金額 — required when transfers.length >= 2. */
  totalAmount: z.string().optional(),
  /** 振込申請メモ. */
  applyComment: z.string().optional(),
  /** 振込情報リスト — 1 to 99 items. */
  transfers: z.array(TransferItemSchema).min(1).max(99),
});

export type TransferCreateInput = z.infer<typeof TransferCreateInputSchema>;

export const TransferCreateResponseSchema = z
  .object({
    accountId: z.string(),
    /** 結果コード: '1'=完了, '2'=未完了 */
    resultCode: z.enum(['1', '2']),
    /** 受付番号（振込申請番号） — 16-char numeric string. */
    applyNo: z.string().length(16),
    /** 振込依頼完了日時 — present only when resultCode='1'. */
    applyEndDatetime: z.string().optional(),
  })
  .strict();

export type TransferCreateResponse = z.infer<typeof TransferCreateResponseSchema>;

/** getResult response — resultCode includes '8' (期限切れ). */
export const TransferResultResponseSchema = z
  .object({
    accountId: z.string(),
    /** 結果コード: '1'=完了, '2'=未完了, '8'=期限切れ */
    resultCode: z.enum(['1', '2', '8']),
    applyNo: z.string().length(16),
    applyEndDatetime: z.string().optional(),
  })
  .strict();

export type TransferResultResponse = z.infer<typeof TransferResultResponseSchema>;

export const TransferGetResultParamsSchema = z.object({
  accountId: z.string(),
  applyNo: z.string().length(16),
});

export type TransferGetResultParams = z.infer<typeof TransferGetResultParamsSchema>;

export const TransferGetStatusParamsSchema = z.object({
  accountId: z.string(),
  /** 1=振込申請照会, 2=振込一括照会 */
  queryKeyClass: z.enum(['1', '2']),
  applyNo: z.string().length(16).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  nextItemKey: z.string().optional(),
});

export type TransferGetStatusParams = z.infer<typeof TransferGetStatusParamsSchema>;

export const TransferCancelInputSchema = z.object({
  accountId: z.string(),
  /**
   * 取消対象キー区分:
   *   '1'=振込申請取消, '2'=振込受付取消
   *   '3'=総合振込申請取消, '4'=総合振込受付取消
   */
  cancelTargetKeyClass: z.enum(['1', '2', '3', '4']),
  applyNo: z.string().length(16),
});

export type TransferCancelInput = z.infer<typeof TransferCancelInputSchema>;

export const TransferCancelResponseSchema = z
  .object({
    accountId: z.string(),
    resultCode: z.enum(['1', '2']),
    applyNo: z.string().length(16),
    applyEndDatetime: z.string().optional(),
  })
  .strict();

export type TransferCancelResponse = z.infer<typeof TransferCancelResponseSchema>;

export const TransferFeeDetailSchema = z
  .object({
    itemId: z.string(),
    /** 個別振込手数料 — numeric string. */
    transferFee: z.string(),
  })
  .strict();

export type TransferFeeDetail = z.infer<typeof TransferFeeDetailSchema>;

export const TransferFeeResponseSchema = z
  .object({
    accountId: z.string(),
    baseDate: z.string(),
    baseTime: z.string(),
    /** 合計振込手数料 — numeric string. */
    totalFee: z.string(),
    transferFeeDetails: z.array(TransferFeeDetailSchema),
  })
  .strict();

export type TransferFeeResponse = z.infer<typeof TransferFeeResponseSchema>;

// ─── Bulk Transfer ────────────────────────────────────────────────────────────

/** Per-item bulk transfer detail (総合振込明細). Shares the same fields as TransferItem. */
export const BulkTransferItemSchema = TransferItemSchema;
export type BulkTransferItem = TransferItem;

export const BulkTransferCreateInputSchema = z.object({
  accountId: z.string(),
  remitterName: z.string().optional(),
  transferDesignatedDate: z.string(),
  transferDateHolidayCode: TransferDateHolidayCodeSchema.optional(),
  /** 振込データ名 — label for this bulk transfer batch. */
  transferDataName: z.string().optional(),
  /** 合計件数 — required for bulk transfers. */
  totalCount: z.string(),
  /** 合計金額 — required for bulk transfers. */
  totalAmount: z.string(),
  applyComment: z.string().optional(),
  /** 総合振込明細リスト — 1 to 9999 items. */
  bulkTransfers: z.array(BulkTransferItemSchema).min(1),
});

export type BulkTransferCreateInput = z.infer<typeof BulkTransferCreateInputSchema>;

export const BulkTransferCreateResponseSchema = z
  .object({
    accountId: z.string(),
    /** 結果コード: '1'=完了, '2'=未完了 */
    resultCode: z.enum(['1', '2']),
    applyNo: z.string().length(16),
    applyEndDatetime: z.string().optional(),
  })
  .strict();

export type BulkTransferCreateResponse = z.infer<typeof BulkTransferCreateResponseSchema>;

// ─── Transfer Status ──────────────────────────────────────────────────────────

/**
 * 振込ステータスコード for individual transfer status queries.
 *
 * Documented in GMO Aozora API v1.8.0 — transfer/status endpoint:
 *   2  = 処理中 (processing)
 *   3  = 処理完了 (completed successfully)
 *   4  = エラー (error)
 *   5  = 取消完了 (cancelled)
 *   8  = 期限切れ (expired)
 *   11 = 振込承認待ち (pending approval)
 *   12 = 振込確定済み (confirmed)
 *   13 = 振込確定取消 (approval cancelled)
 *   20 = 振込依頼済み (request submitted)
 *   22 = 振込確認中 (being confirmed)
 *   24 = 振込完了 (transfer completed)
 *   25 = 振込失敗 (transfer failed)
 *   26 = 振込取消済 (transfer cancelled)
 *   40 = システムエラー (system error)
 */
export const TransferRequestStatusCodeSchema = z.enum([
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
]);
export type TransferRequestStatusCode = z.infer<typeof TransferRequestStatusCodeSchema>;

export const TransferStatusItemSchema = z
  .object({
    applyNo: z.string(),
    requestTransferStatus: TransferRequestStatusCodeSchema,
    transferDesignatedDate: z.string().optional(),
    applyDatetime: z.string().optional(),
    /** Additional fields passed through to support future API additions. */
  })
  .passthrough();

export type TransferStatusItem = z.infer<typeof TransferStatusItemSchema>;

export const TransferStatusResponseSchema = z
  .object({
    accountId: z.string(),
    transferStatusList: z.array(TransferStatusItemSchema),
    nextItemKey: z.string().optional(),
  })
  .passthrough();

export type TransferStatusResponse = z.infer<typeof TransferStatusResponseSchema>;

// ─── Bulk Transfer Status ──────────────────────────────────────────────────────

/**
 * 振込ステータスコード for bulk transfer status queries.
 *
 * Bulk-specific codes (30 = 一括振込結果確定済み) replace some individual codes.
 *   2  = 処理中
 *   3  = 処理完了
 *   4  = エラー
 *   5  = 取消完了
 *   8  = 期限切れ
 *   11 = 振込承認待ち
 *   12 = 振込確定済み
 *   13 = 振込確定取消
 *   20 = 振込依頼済み
 *   30 = 一括振込結果確定済み (bulk-specific)
 *   40 = システムエラー
 */
export const BulkTransferRequestStatusCodeSchema = z.enum([
  '2',
  '3',
  '4',
  '5',
  '8',
  '11',
  '12',
  '13',
  '20',
  '30',
  '40',
]);
export type BulkTransferRequestStatusCode = z.infer<typeof BulkTransferRequestStatusCodeSchema>;

export const BulkTransferStatusItemSchema = z
  .object({
    applyNo: z.string(),
    requestTransferStatus: BulkTransferRequestStatusCodeSchema,
    transferDesignatedDate: z.string().optional(),
    applyDatetime: z.string().optional(),
  })
  .passthrough();

export type BulkTransferStatusItem = z.infer<typeof BulkTransferStatusItemSchema>;

export const BulkTransferStatusResponseSchema = z
  .object({
    accountId: z.string(),
    transferStatusList: z.array(BulkTransferStatusItemSchema),
    nextItemKey: z.string().optional(),
  })
  .passthrough();

export type BulkTransferStatusResponse = z.infer<typeof BulkTransferStatusResponseSchema>;
