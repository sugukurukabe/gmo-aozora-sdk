/** 種別コード — '11' = 給与振込, '12' = 賞与振込. NEVER widen to string. */
export type ZenginShorui = '11' | '12';

/** レコード区分 */
export type RecordKubun = '1' | '2' | '8' | '9';

/** 預金種別 — '1' = 普通, '2' = 当座, '4' = 貯蓄, '9' = その他 */
export type AccountTypeCode = '1' | '2' | '4' | '9';

/** 振込指定区分 — '0' = 電信, '7' = 文書 */
export type TransferDesignation = '0' | '7';

/** 新規コード — '0' = 新規, '1' = 変更, '2' = 取消 */
export type NewCode = '0' | '1' | '2';

/** Remitter (委託者) information provided by the caller */
export type ZenginRemitter = {
  /** 委託者コード: up to 10 digits, right-justified zero-padded */
  code: string;
  /** 委託者名: up to 40 half-width kana bytes, space-padded */
  name: string;
  /** 取引銀行番号: 4 digits */
  bankCode: string;
  /** 取引銀行名: up to 15 half-width kana bytes */
  bankName: string;
  /** 取引支店番号: 3 digits */
  branchCode: string;
  /** 取引支店名: up to 15 half-width kana bytes */
  branchName: string;
  /** 預金種別 */
  accountTypeCode: AccountTypeCode;
  /** 口座番号: 7 digits, right-justified zero-padded */
  accountNumber: string;
};

/** One transfer recipient record */
export type ZenginRecord = {
  /** 取引銀行番号: exactly 4 digits */
  bankCode: string;
  /** 取引銀行名: up to 15 half-width kana bytes */
  bankName?: string;
  /** 取引支店番号: exactly 3 digits */
  branchCode: string;
  /** 取引支店名: up to 15 half-width kana bytes */
  branchName?: string;
  /** 預金種別 */
  accountTypeCode: AccountTypeCode;
  /** 口座番号: exactly 7 digits */
  accountNumber: string;
  /** 受取人名: up to 30 half-width kana bytes */
  beneficiaryName: string;
  /** 振込金額: positive integer, max 10 digits */
  amount: bigint | string;
  /** 顧客コード1 (optional): up to 10 bytes */
  customerCode1?: string;
  /** 顧客コード2 (optional): up to 10 bytes */
  customerCode2?: string;
  /** EDI情報 (optional): up to 10 bytes */
  ediInfo?: string;
  /** 新規コード — defaults to '0' */
  newCode?: NewCode;
  /** 振込指定区分 — defaults to '0' (電信) */
  transferDesignation?: TransferDesignation;
};

/** Full input for building a Zengin format file */
export type ZenginFileInput = {
  shorui: ZenginShorui;
  /** 取組日: 'MMDD' or 'YYYYMMDD' (only last 4 chars used) */
  transferDate: string;
  remitter: ZenginRemitter;
  records: readonly ZenginRecord[];
};
