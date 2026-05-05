import { buildHeaderRecord } from './records/header.js';
import { buildDataRecord } from './records/data.js';
import { buildTrailerRecord } from './records/trailer.js';
import { buildEndRecord } from './records/end.js';
import { ZenginFileInputSchema } from './schemas.js';
import type { ZenginFileInput } from './types.js';

export class ZenginValidationError extends Error {
  readonly issues: unknown;
  constructor(issues: unknown) {
    super('ZenginFileInput validation failed');
    this.issues = issues;
    this.name = 'ZenginValidationError';
  }
}

/**
 * Build a complete Zengin format file buffer from the given input.
 *
 * The returned Buffer contains:
 *   1 header record (120 bytes)
 *   N data records  (120 bytes each)
 *   1 trailer record (120 bytes)
 *   1 end record    (120 bytes)
 *
 * Total size = (N + 3) × 120 bytes.
 *
 * Every record is validated to be exactly 120 bytes before assembly.
 * Input is validated against ZenginFileInputSchema before processing.
 *
 * @throws {ZenginValidationError} for schema validation failures
 * @throws {Error} from underlying record builders if byte-length assertions fail
 */
export function buildZenginFile(input: ZenginFileInput): Buffer {
  const parsed = ZenginFileInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ZenginValidationError(parsed.error.issues);
  }

  // Use the original input records (validated above) to avoid exactOptionalPropertyTypes
  // mismatch between Zod-inferred types and manual TypeScript optional properties.
  const { records } = input;

  const header = buildHeaderRecord(input);

  let totalAmount = BigInt(0);
  const dataBuffers: Buffer[] = [];
  for (const rec of records) {
    const amount = typeof rec.amount === 'bigint' ? rec.amount : BigInt(rec.amount);
    totalAmount += amount;
    dataBuffers.push(buildDataRecord(rec));
  }

  const trailer = buildTrailerRecord(records.length, totalAmount);
  const end = buildEndRecord();

  return Buffer.concat([header, ...dataBuffers, trailer, end]);
}
