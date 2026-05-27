import { QueryClient, keepPreviousData } from '@tanstack/react-query';
import { isSessionAuthError } from '@/shared/api/errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 30 * 60_000,
      retry: (failureCount, error) =>
        isSessionAuthError(error) ? false : failureCount < 1,
      refetchOnWindowFocus: false,
      placeholderData: keepPreviousData,
    },
    mutations: {
      retry: 0,
    },
  },
});
