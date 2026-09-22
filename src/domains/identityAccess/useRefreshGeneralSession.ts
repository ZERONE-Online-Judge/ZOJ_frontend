import { useEffect, useState } from 'react';
import { getGeneralMe } from '@/domains/identityAccess/api';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';

const refreshRequests = new Map<string, ReturnType<typeof getGeneralMe>>();

export function useRefreshGeneralSession() {
  const generalSession = useSessionStore((state) => state.generalSession);
  const setGeneralSession = useSessionStore((state) => state.setGeneralSession);
  const token = generalSession?.accessToken;
  const email = generalSession?.account.email;
  const identity = `${email ?? ''}:${token ?? ''}`;
  const [completedIdentity, setCompletedIdentity] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!token || !email) return;

    let cancelled = false;
    let pending = false;

    function currentSession() {
      const current = useSessionStore.getState().generalSession;
      return current &&
        current.accessToken === token &&
        current.account.email === email
        ? current
        : null;
    }

    function refresh() {
      const current = currentSession();
      if (cancelled || pending || !current) return;
      pending = true;
      let request = refreshRequests.get(current.accessToken);

      if (!request) {
        request = getGeneralMe(current.accessToken, current).finally(() => {
          refreshRequests.delete(current.accessToken);
        });
        refreshRequests.set(current.accessToken, request);
      }

      void request
        .then((session) => {
          if (
            !cancelled &&
            currentSession() &&
            session.account.email === email
          ) {
            setGeneralSession(session);
          }
        })
        .catch(() => undefined)
        .finally(() => {
          pending = false;
          if (!cancelled) setCompletedIdentity(identity);
        });
    }

    function refreshWhenVisible() {
      if (!document.hidden) refresh();
    }

    refresh();
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    const interval = window.setInterval(() => {
      const current = currentSession();
      if (current?.operatorSession || current?.operatorContests.length) {
        refreshWhenVisible();
      }
    }, 60_000);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.clearInterval(interval);
    };
  }, [token, email, identity, setGeneralSession]);

  return Boolean(token && completedIdentity !== identity);
}
