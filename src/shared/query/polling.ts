import { isApiClientError } from '@/shared/api/errors';

export function pollDelay(milliseconds: number, random = Math.random()) {
  return Math.round(milliseconds * (0.85 + random * 0.3));
}

export function queryRetryDelay(attempt: number, error: unknown) {
  const requested = isApiClientError(error)
    ? Number(error.details?.retry_after_seconds)
    : 0;
  const base =
    requested > 0
      ? Math.min(requested * 1000, 60_000)
      : Math.min(1000 * 2 ** attempt, 30_000);
  return base + Math.round(Math.random() * 1000);
}
