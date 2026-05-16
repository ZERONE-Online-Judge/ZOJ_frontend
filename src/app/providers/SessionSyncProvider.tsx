import { useEffect, type ReactNode } from 'react';
import { SESSION_SYNC_EVENT } from '@/domains/identityAccess/sessionStorage';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';

export default function SessionSyncProvider({
  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    const syncSessions = () => {
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
