import { Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutGeneral } from '@/domains/identityAccess/api';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';
import { navigationRoutes } from '@/routes/routeConfig';
import SiteBrand from '@/components/layout/SiteBrand';

function PublicHeader() {
  const navigate = useNavigate();
  const generalSession = useSessionStore((state) => state.generalSession);
  const clearSessions = useSessionStore((state) => state.clearSessions);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      if (generalSession?.accessToken) {
        await logoutGeneral(
          generalSession.accessToken,
          generalSession.refreshToken,
        );
      }
    } catch {
      // 로컬 세션 정리는 계속 진행해 사용자가 로그아웃 상태로 돌아가게 한다.
    } finally {
      clearSessions();
      setIsLoggingOut(false);
      navigate('/');
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white font-sans">
      <div className="relative flex h-20 w-full items-center justify-between px-12">
        <Link className="flex items-center gap-3" to="/">
          <SiteBrand />
        </Link>

        <nav
          aria-label="Main navigation"
          className="absolute left-1/2 -translate-x-1/2"
        >
          <ul className="flex items-center gap-24 text-center text-lg leading-7 font-semibold tracking-normal text-slate-700">
            {navigationRoutes.map(({ name, path }) => (
              <li key={path}>
                <NavLink
                  className={({ isActive }) =>
                    [
                      'hover:text-zoj-blue whitespace-nowrap transition',
                      isActive ? 'text-zoj-blue' : 'text-slate-700',
                    ].join(' ')
                  }
                  to={path}
                >
                  {name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex w-48 justify-end">
          {generalSession ? (
            <button
              className="flex h-11 items-center gap-2 rounded border border-slate-200 bg-white px-5 text-base font-bold text-slate-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:text-slate-400"
              disabled={isLoggingOut}
              onClick={handleLogout}
              type="button"
            >
              <svg
                aria-hidden="true"
                className="size-5"
                fill="none"
                viewBox="0 0 20 20"
              >
                <path
                  d="M8.25 4.25H5.5a1.5 1.5 0 0 0-1.5 1.5v8.5a1.5 1.5 0 0 0 1.5 1.5h2.75M12 6.5 15.5 10 12 13.5M15.25 10H8"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
              <span>{isLoggingOut ? '로그아웃 중' : '로그아웃'}</span>
            </button>
          ) : (
            <Link
              className="flex h-11 items-center gap-2 rounded border border-slate-200 bg-white px-5 text-base font-bold text-indigo-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50"
              to="/login"
            >
              <svg
                aria-hidden="true"
                className="size-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                <path d="M2.5 18.5a7.5 7.5 0 0 1 15 0 .5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5Z" />
              </svg>
              <span>로그인</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default function Header() {
  return <PublicHeader />;
}
