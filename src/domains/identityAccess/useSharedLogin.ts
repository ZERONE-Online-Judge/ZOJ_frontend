import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/shared/api/client';
import { isSessionAuthError } from '@/shared/api/errors';
import { mapGeneralSession } from './sessionStorage';
import { useSessionStore } from './sessionStore';
import type { GeneralSessionApi } from './types';

// Restore on arrival/focus. Anonymous visitors do not continuously poll auth.
export function useSharedLogin() {
  const client = useQueryClient();
  const setSession = useSessionStore((s) => s.setGeneralSession);
  useEffect(() => {
    let active = true,
      pending = false;
    async function restore() {
      if (!active || pending || document.hidden) return;
      const before = useSessionStore.getState().generalSession;
      pending = true;
      try {
        const data = await apiRequest<GeneralSessionApi>(
          '/auth/general/sso',
          undefined,
          {
            method: 'POST',
            body: JSON.stringify(
              before?.refreshToken
                ? { refresh_token: before.refreshToken }
                : {},
            ),
          },
        );
        const current = useSessionStore.getState().generalSession;
        if (!active || current?.accessToken !== before?.accessToken) return;
        const session = mapGeneralSession(data);
        if (current && current.account.email !== session.account.email) {
          await client.cancelQueries();
          client.clear();
          useSessionStore.getState().clearSessions();
        }
        setSession(session);
      } catch (error) {
        if (
          active &&
          isSessionAuthError(error) &&
          useSessionStore.getState().generalSession?.accessToken ===
            before?.accessToken &&
          before
        ) {
          await client.cancelQueries();
          client.clear();
          useSessionStore.getState().clearSessions();
        }
      } finally {
        pending = false;
      }
    }
    void restore();
    window.addEventListener('focus', restore);
    document.addEventListener('visibilitychange', restore);
    return () => {
      active = false;
      window.removeEventListener('focus', restore);
      document.removeEventListener('visibilitychange', restore);
    };
  }, [client, setSession]);
}
