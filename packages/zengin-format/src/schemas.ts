import { z } from 'zod';

export const ZenginShoruiSchema = z.union([z.literal('11'), z.literal('12')]);

export const AccountTypeCodeSchema = z.union([
  z.literal('1'),
  z.literal('2'),
  z.literal('4'),
  z.literal('9'),
]);

export const NewCodeSchema = z.union([z.literal('0'), z.literal('1'), z.literal('2')]);

export const TransferDesignationSchema = z.union([z.literal('0'), z.literal('7')]);

export const ZenginRemitterSchema = z.object({
  code: z.string().max(10),
  name: z.string().max(40),
  bankCode: z.string().length(4),
  bankName: z.string().max(15),
  branchCode: z.string().length(3),
  branchName: z.string().max(15),
  accountTypeCode: AccountTypeCodeSchema,
  accountNumber: z.string().length(7),
});

export const ZenginRecordSchema = z.object({
  bankCode: z.string().length(4),
  bankName: z.string().max(15).optional(),
  branchCode: z.string().length(3),
  branchName: z.string().max(15).optional(),
  accountTypeCode: AccountTypeCodeSchema,
  accountNumber: z.string().length(7),
  beneficiaryName: z.string().max(30),
  amount: z.union([z.bigint().positive(), z.string().regex(/^\d+$/)]),
  customerCode1: z.string().max(10).optional(),
  customerCode2: z.string().max(10).optional(),
  ediInfo: z.string().max(10).optional(),
  newCode: NewCodeSchema.optional(),
  transferDesignation: TransferDesignationSchema.optional(),
});

export const ZenginFileInputSchema = z.object({
  shorui: ZenginShoruiSchema,
  transferDate: z.string().regex(/^\d{4}(\d{4})?$/, {
    message: 'transferDate must be MMDD or YYYYMMDD',
  }),
  remitter: ZenginRemitterSchema,
  records: z.array(ZenginRecordSchema).min(1),
});

export type ZenginFileInputValidated = z.infer<typeof ZenginFileInputSchema>;
