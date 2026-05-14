import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { logoutGeneral } from '@/domains/identityAccess/api';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';
import SiteBrand from '@/components/layout/SiteBrand';

type ContestHeaderProps = {
  contestId: string;
};

const contestNavigationRoutes = [
  { name: '개요', path: '' },
  { name: '문제집', path: 'problems' },
  { name: '채점 현황', path: 'submissions' },
  { name: '스코어 보드', path: 'scoreboard' },
  { name: '게시판', path: 'board' },
] as const;

export default function ContestHeader({ contestId }: ContestHeaderProps) {
  const navigate = useNavigate();
  const generalSession = useSessionStore((state) => state.generalSession);
  const participantSession = useSessionStore(
    (state) => state.participantSession,
  );
  const clearSessions = useSessionStore((state) => state.clearSessions);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const participantContest = generalSession?.participantContests.find(
    (item) => item.contest.contest_id === contestId,
  );
  const teamName =
    participantContest?.team.team_name ??
    (participantSession?.contestId === contestId
      ? participantSession.team.team_name
      : null);

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
          aria-label="Contest navigation"
          className="absolute left-1/2 -translate-x-1/2"
        >
          <ul className="flex items-center gap-16 text-center text-lg leading-7 font-semibold tracking-normal text-slate-700">
            {contestNavigationRoutes.map(({ name, path }) => {
              const to = path
                ? `/contests/${contestId}/${path}`
                : `/contests/${contestId}`;

              return (
                <li key={path || 'overview'}>
                  <NavLink
                    className={({ isActive }) =>
                      [
                        'hover:text-zoj-blue whitespace-nowrap transition',
                        isActive ? 'text-zoj-blue' : 'text-slate-700',
                      ].join(' ')
                    }
                    end={!path}
                    to={to}
                  >
                    {name}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex min-w-80 items-center justify-end gap-3">
          {generalSession ? (
            <>
              {teamName ? (
                <span className="max-w-36 truncate text-right text-sm font-bold text-slate-600">
                  {teamName}
                </span>
              ) : null}
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
            </>
          ) : (
            <Link
              className="flex h-11 items-center gap-2 rounded border border-slate-200 bg-white px-5 text-base font-bold text-indigo-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50"
              to={`/login?reason=contest&contestId=${encodeURIComponent(contestId)}`}
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
