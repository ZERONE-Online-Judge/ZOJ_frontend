import { useEffect, useState } from 'react';
import { getGeneralMe } from '@/domains/identityAccess/api';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';

const refreshRequests = new Map<string, ReturnType<typeof getGeneralMe>>();

export function useRefreshGeneralSession() {
  const generalSession = useSessionStore((state) => state.generalSession);
  const setGeneralSession = useSessionStore((state) => state.setGeneralSession);
  const [isRefreshingGeneralSession, setIsRefreshingGeneralSession] =
    useState(false);

  useEffect(() => {
    if (!generalSession?.accessToken) return;

    const token = generalSession.accessToken;
    let cancelled = false;
    let request = refreshRequests.get(token);

    if (!request) {
      request = getGeneralMe(token, generalSession).finally(() => {
        refreshRequests.delete(token);
      });
      refreshRequests.set(token, request);
    }

    setIsRefreshingGeneralSession(true);
    void request
      .then((session) => {
        if (!cancelled) setGeneralSession(session);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsRefreshingGeneralSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, [generalSession?.accessToken, setGeneralSession]);

  return isRefreshingGeneralSession;
}
