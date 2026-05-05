// Base error — all SDK errors extend this
export class GmoAozoraError extends Error {
  readonly code: string;
  readonly requestId: string | undefined;

  constructor(params: { code: string; message: string; requestId?: string; cause?: unknown }) {
    super(params.message, { cause: params.cause });
    this.name = this.constructor.name;
    this.code = params.code;
    this.requestId = params.requestId;
  }
}

// OAuth / token failures
export class GmoAozoraAuthError extends GmoAozoraError {
  constructor(params: { code: string; message: string; requestId?: string; cause?: unknown }) {
    super(params);
    this.name = 'GmoAozoraAuthError';
  }
}

// PKCE state parameter mismatch
export class GmoAozoraStateMismatchError extends GmoAozoraAuthError {
  constructor(params?: { message?: string }) {
    super({
      code: 'STATE_MISMATCH',
      message: params?.message ?? 'OAuth state parameter does not match. Possible CSRF attack.',
    });
    this.name = 'GmoAozoraStateMismatchError';
  }
}

// API returned a structured error response
export class GmoAozoraApiError extends GmoAozoraError {
  readonly status: number;

  constructor(params: {
    code: string;
    message: string;
    status: number;
    requestId?: string;
    cause?: unknown;
  }) {
    super(params);
    this.name = 'GmoAozoraApiError';
    this.status = params.status;
  }
}

// Zod schema validation failure on API response
export class GmoAozoraValidationError extends GmoAozoraError {
  readonly issues: unknown;

  constructor(params: { message: string; issues?: unknown; requestId?: string }) {
    const base: ConstructorParameters<typeof GmoAozoraError>[0] = {
      code: 'RESPONSE_PARSE_FAILED',
      message: params.message,
    };
    if (params.requestId !== undefined) base.requestId = params.requestId;
    super(base);
    this.name = 'GmoAozoraValidationError';
    this.issues = params.issues;
  }
}

// 5xx server error (retriable)
export class GmoAozoraServerError extends GmoAozoraApiError {
  constructor(params: { status: number; message: string; requestId?: string; cause?: unknown }) {
    const base: ConstructorParameters<typeof GmoAozoraApiError>[0] = {
      code: 'SERVER_ERROR',
      message: params.message,
      status: params.status,
    };
    if (params.requestId !== undefined) base.requestId = params.requestId;
    if (params.cause !== undefined) base.cause = params.cause;
    super(base);
    this.name = 'GmoAozoraServerError';
  }
}

// pollResult exceeded timeoutMs
export class GmoAozoraTimeoutError extends GmoAozoraError {
  constructor(params: { message?: string; requestId?: string }) {
    const base: ConstructorParameters<typeof GmoAozoraError>[0] = {
      code: 'TIMEOUT',
      message: params.message ?? 'Operation timed out waiting for result.',
    };
    if (params.requestId !== undefined) base.requestId = params.requestId;
    super(base);
    this.name = 'GmoAozoraTimeoutError';
  }
}

function assertNever(x: never): never {
  throw new GmoAozoraError({
    code: 'UNHANDLED_CASE',
    message: `Unhandled case: ${JSON.stringify(x)}`,
  });
}

export { assertNever };
