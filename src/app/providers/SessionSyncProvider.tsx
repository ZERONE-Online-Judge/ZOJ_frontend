import { useEffect, type ReactNode } from 'react';
import {
  SESSION_SYNC_EVENT,
  SESSION_EXPIRED_EVENT,
  SESSION_EXPIRED_STORAGE_KEY,
} from '@/domains/identityAccess/sessionStorage';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';

export default function SessionSyncProvider({
  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    const syncSessions = (event: Event) => {
      if (
        event instanceof window.StorageEvent &&
        event.key === SESSION_EXPIRED_STORAGE_KEY &&
        event.newValue
      ) {
        try {
          const detail = JSON.parse(event.newValue) as {
            email?: string;
            requestPath?: string;
          };
          const current = useSessionStore.getState();
          const email =
            current.generalSession?.account.email ??
            current.participantSession?.member.email;
          if (email && email === detail.email) {
            window.dispatchEvent(
              new CustomEvent(SESSION_EXPIRED_EVENT, {
                detail: { requestPath: detail.requestPath },
              }),
            );
          }
        } catch {
          /* Ignore unrelated or malformed cross-tab messages. */
        }
      }
      useSessionStore.getState().syncSessionsFromStorage();
    };

    window.addEventListener('storage', syncSessions);
    window.addEventListener(SESSION_SYNC_EVENT, syncSessions);

    return () => {
      window.removeEventListener('storage', syncSessions);
      window.removeEventListener(SESSION_SYNC_EVENT, syncSessions);
    };
  }, []);

  return children;
}
