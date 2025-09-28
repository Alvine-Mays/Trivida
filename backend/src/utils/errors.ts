export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED'
  | 'SESSION_REVOKED'
  | 'PRECONDITION_FAILED'
  | 'INTERNAL_ERROR'
  | 'BAD_REQUEST';

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;
  details?: unknown;
  constructor(code: ApiErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function errorBody(err: ApiError | Error) {
  if (err instanceof ApiError) return { code: err.code, message: err.message, details: err.details };
  return { code: 'INTERNAL_ERROR', message: 'Une erreur interne est survenue' };
}
