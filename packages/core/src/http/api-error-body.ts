import { z } from 'zod';

/** Parsed GMO API error JSON body (best-effort; unknown keys preserved). */
export const ApiErrorBodySchema = z
  .object({
    errorCode: z.string().optional(),
    errorMessage: z.string().optional(),
    requestId: z.string().optional(),
  })
  .passthrough();

export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;
