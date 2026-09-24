import { useEffect } from 'react';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';
import { expireStoredAccountSession } from '@/domains/identityAccess/sessionStorage';
import { API_BASE_URL, apiRequest } from '@/shared/api/client';

// One authenticated stream per tab. The server checks the persisted session,
// so revocations work across API workers without waiting for a page request.
export function useSessionRevocation() {
  const generalToken = useSessionStore(
    (state) => state.generalSession?.accessToken,
  );
  const participantToken = useSessionStore(
    (state) => state.participantSession?.accessToken,
  );
  const contestId = useSessionStore(
    (state) => state.participantSession?.contestId,
  );
  const token = generalToken ?? participantToken;

  useEffect(() => {
    if (!token) return;
    const sessionToken = token;
    let stopped = false;
    let controller: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let retryDelay = 1000;

    async function connect() {
      controller?.abort();
      const attempt = new AbortController();
      controller = attempt;
      try {
        const response = await fetch(`${API_BASE_URL}/auth/session-events`, {
          headers: {
            authorization: `Bearer ${token}`,
            accept: 'text/event-stream',
          },
          credentials: 'include',
          cache: 'no-store',
          signal: attempt.signal,
        });
        if (stopped || attempt.signal.aborted) return;
        if (response.status === 401) {
          // Ordinary access-token expiry may still be refreshable. The normal
          // auth flow distinguishes it from a revoked account and emits logout.
          await apiRequest(
            generalToken
              ? '/auth/general/me'
              : `/contests/${contestId}/participant-session/me`,
            token,
          );
          return;
        }
        if (!response.ok || !response.body)
          throw new Error('Session stream unavailable');
        retryDelay = 1000;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
          while (!stopped && !attempt.signal.aborted) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let end: number;
            while ((end = buffer.indexOf('\n\n')) >= 0) {
              const frame = buffer.slice(0, end);
              buffer = buffer.slice(end + 2);
              if (
                frame
                  .split('\n')
                  .some((line) => line.trim() === 'event: session_revoked')
              ) {
                if (!stopped && !attempt.signal.aborted)
                  expireStoredAccountSession(
                    sessionToken,
                    '/auth/session-events',
                  );
                return;
              }
            }
          }
        } finally {
          await reader.cancel().catch(() => undefined);
          reader.releaseLock();
        }
      } catch {
        // A network interruption is not a logout. Reconnect and reauthenticate.
      } finally {
        if (!stopped && !attempt.signal.aborted) {
          timer = setTimeout(() => void connect(), retryDelay);
          retryDelay = Math.min(retryDelay * 2, 15_000);
        }
      }
    }

    function reconnect() {
      if (document.visibilityState !== 'visible') return;
      clearTimeout(timer);
      void connect();
    }
    void connect();
    window.addEventListener('online', reconnect);
    document.addEventListener('visibilitychange', reconnect);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      window.removeEventListener('online', reconnect);
      document.removeEventListener('visibilitychange', reconnect);
    };
  }, [token, generalToken, contestId]);
}
