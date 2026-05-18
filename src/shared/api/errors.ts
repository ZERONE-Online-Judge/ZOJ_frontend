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

export function formatUserApiError(error: unknown, fallback: string) {
  if (error instanceof ApiClientError) {
    if (error.status === 401 || error.status === 403) {
      return `${fallback}: 로그인 상태 또는 접근 권한을 확인해 주세요.`;
    }

    if (error.status === 404) {
      return `${fallback}: 요청한 정보를 찾을 수 없습니다.`;
    }

    if (error.status === 409) {
      return `${fallback}: 이미 처리된 정보이거나 현재 상태와 충돌합니다.`;
    }

    if (error.status === 429) {
      return `${fallback}: 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.`;
    }

    if (error.status >= 500) {
      return `${fallback}: 서버 응답이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.`;
    }

    return fallback;
  }

  if (error instanceof Error) {
    return fallback;
  }

  return fallback;
}

export function readRetryAfterSeconds(error: unknown) {
  if (!(error instanceof ApiClientError)) return 0;

  const value = error.details?.retry_after_seconds;
  return typeof value === 'number' && value > 0 ? value : 0;
}
