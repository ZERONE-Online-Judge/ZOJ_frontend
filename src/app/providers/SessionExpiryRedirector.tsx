import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  SESSION_EXPIRED_EVENT,
  type SessionExpiredEventDetail,
} from '@/domains/identityAccess/sessionStorage';
import { safeLoginRedirectTarget } from '@/shared/lib/loginRedirect';
import SessionExpiredNotice from '@/components/auth/SessionExpiredNotice';

function loginRedirectPath(currentPath: string) {
  const target = safeLoginRedirectTarget(currentPath);
  const search = new URLSearchParams({ reason: 'session' });
  if (target) search.set('moveTo', target);
  return `/login?${search.toString()}`;
}

export default function SessionExpiryRedirector() {
  const location = useLocation();
  const navigate = useNavigate();
  const [expiredPath, setExpiredPath] = useState<string | null>(null);

  useEffect(() => {
    function onSessionExpired(event: Event) {
      const detail = (event as CustomEvent<SessionExpiredEventDetail>).detail;
      const currentPath =
        detail?.currentPath ??
        `${location.pathname}${location.search}${location.hash}`;

      setExpiredPath((previous) => previous ?? currentPath);
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    };
  }, [location.hash, location.pathname, location.search]);

  if (expiredPath === null) return null;

  function leave(to: string) {
    navigate(to, { replace: true });
    setExpiredPath(null);
  }

  return (
    <SessionExpiredNotice
      onHome={() => leave('/')}
      onLogin={() => leave(loginRedirectPath(expiredPath))}
    />
  );
}
