import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  SESSION_EXPIRED_EVENT,
  type SessionExpiredEventDetail,
} from '@/domains/identityAccess/sessionStorage';
import { safeLoginRedirectTarget } from '@/shared/lib/loginRedirect';

function loginRedirectPath(currentPath: string) {
  const target = safeLoginRedirectTarget(currentPath);
  const search = new URLSearchParams({ reason: 'session' });
  if (target) search.set('moveTo', target);
  return `/login?${search.toString()}`;
}

export default function SessionExpiryRedirector() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    function onSessionExpired(event: Event) {
      const detail = (event as CustomEvent<SessionExpiredEventDetail>).detail;
      const currentPath =
        detail?.currentPath ??
        `${location.pathname}${location.search}${location.hash}`;

      if (location.pathname === '/login') return;

      navigate(loginRedirectPath(currentPath), { replace: true });
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    };
  }, [location.hash, location.pathname, location.search, navigate]);

  return null;
}
