import { QueryClient, keepPreviousData } from '@tanstack/react-query';
import { isSessionAuthError } from '@/shared/api/errors';
import { queryRetryDelay } from './polling';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 30 * 60_000,
      retry: (failureCount, error) =>
        isSessionAuthError(error) ? false : failureCount < 1,
      retryDelay: queryRetryDelay,
      refetchOnWindowFocus: false,
      placeholderData: keepPreviousData,
    },
    mutations: {
      retry: 0,
    },
  },
});
