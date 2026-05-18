import type { ApiErrorBody } from '@/shared/api/types';

export class ApiClientError extends Error {
  status: number;
  code: string;
  requestId?: string;
  details?: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    requestId?: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

export function toApiError(response: Response, payload: unknown) {
  const body = payload as ApiErrorBody | null;

  return new ApiClientError(
    response.status,
    body?.error?.code ?? 'request_failed',
    body?.error?.message ?? `API ${response.status}`,
    body?.error?.request_id ?? body?.request_id,
    body?.error?.details,
  );
}

export function formatApiError(error: unknown, fallback: string) {
  if (error instanceof ApiClientError) {
    const requestId = error.requestId ? `, request_id: ${error.requestId}` : '';
    return `${fallback}: ${error.message} (${error.code}, HTTP ${error.status}${requestId})`;
  }

  if (error instanceof Error) {
    return `${fallback}: ${error.message}`;
  }

  return fallback;
}

export function readRetryAfterSeconds(error: unknown) {
  if (!(error instanceof ApiClientError)) return 0;

  const value = error.details?.retry_after_seconds;
  return typeof value === 'number' && value > 0 ? value : 0;
}

