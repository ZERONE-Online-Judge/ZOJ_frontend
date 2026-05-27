import { useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';
import { SESSION_EXPIRED_EVENT } from '@/domains/identityAccess/sessionStorage';
import { refreshActiveAccessTokens } from '@/shared/api/client';

const SESSION_REFRESH_INTERVAL_MS = 4 * 60 * 1000;

export default function SessionRefreshProvider({
  children,
}: {
  children: ReactNode;
}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    function handleSessionExpired() {
      useSessionStore.getState().syncSessionsFromStorage();
      void queryClient.cancelQueries();
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [queryClient]);

  useEffect(() => {
    let pending = false;

    async function refreshSessions() {
      const { generalSession, syncSessionsFromStorage } =
        useSessionStore.getState();
      if (!generalSession || pending) return;

      pending = true;
      try {
        const refreshed = await refreshActiveAccessTokens();
        if (refreshed) syncSessionsFromStorage();
      } catch {
        // 401 retry handling in apiRequest remains the authoritative fallback.
      } finally {
        pending = false;
      }
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshSessions();
    }, SESSION_REFRESH_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return children;
}
