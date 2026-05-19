import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import SessionRefreshProvider from '@/app/providers/SessionRefreshProvider';
import SessionSyncProvider from '@/app/providers/SessionSyncProvider';
import { queryClient } from '@/shared/query/queryClient';

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionSyncProvider>
        <SessionRefreshProvider>{children}</SessionRefreshProvider>
      </SessionSyncProvider>
    </QueryClientProvider>
  );
}
