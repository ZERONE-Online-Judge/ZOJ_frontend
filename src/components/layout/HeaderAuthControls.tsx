import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import HeaderNotifications from '@/components/layout/HeaderNotifications';
import { headerText } from '@/data/uiText';
import { contestAccessPhase } from '@/domains/contestAdministration/logic';
import type { Contest } from '@/domains/contestAdministration/types';
import { logoutGeneral } from '@/domains/identityAccess/api';
import { isServiceMaster } from '@/domains/identityAccess/permissions';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';
import { useRefreshGeneralSession } from '@/domains/identityAccess/useRefreshGeneralSession';
import { formatContestMoment } from '@/shared/lib/dateTime';

type HeaderAuthControlsProps = {
  loginTo: string;
};

type ContestSectionKey = 'running' | 'upcoming' | 'ended';

const accountContestSections: {
  key: ContestSectionKey;
  title: string;
}[] = [
  { key: 'running', title: '진행중 대회' },
  { key: 'upcoming', title: '운영예정 대회' },
  { key: 'ended', title: '이미 종료된 대회' },
];

function sectionKeyForContest(contest: Contest): ContestSectionKey {
  const phase = contestAccessPhase(contest);
  if (phase === 'running') return 'running';
  if (phase === 'ended') return 'ended';
  return 'upcoming';
}

function contestSortDate(contest: Contest) {
  const sectionKey = sectionKeyForContest(contest);
  const value = sectionKey === 'ended' ? contest.end_at : contest.start_at;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortContestsByRecentDate<T extends { contest: Contest }>(items: T[]) {
  return [...items].sort(
    (a, b) => contestSortDate(b.contest) - contestSortDate(a.contest),
  );
}

function LogoutIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
      <path
        d="M8.25 4.25H5.5a1.5 1.5 0 0 0-1.5 1.5v8.5a1.5 1.5 0 0 0 1.5 1.5h2.75M12 6.5 15.5 10 12 13.5M15.25 10H8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function LoginIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M10 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M2.5 18.5a7.5 7.5 0 0 1 15 0 .5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5Z" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
      <path
        d="M4 7.5 10 3l6 4.5v7.25a1.25 1.25 0 0 1-1.25 1.25h-9.5A1.25 1.25 0 0 1 4 14.75V7.5ZM7.5 9.25h5M7.5 12.25h5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export default function HeaderAuthControls({
  loginTo,
}: HeaderAuthControlsProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useRefreshGeneralSession();
  const generalSession = useSessionStore((state) => state.generalSession);
  const clearSessions = useSessionStore((state) => state.clearSessions);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);
  const accountEmail = generalSession?.account.email;
  const participantContestSections = accountContestSections.map((section) => ({
    ...section,
    contests: sortContestsByRecentDate(
      generalSession?.participantContests.filter(
        (item) => sectionKeyForContest(item.contest) === section.key,
      ) ?? [],
    ),
  }));

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
      // Keep local cleanup reliable even when server-side revoke fails.
    } finally {
      setIsAccountPanelOpen(false);
      setIsLogoutConfirmOpen(false);
      await queryClient.cancelQueries();
      queryClient.clear();
      navigate('/', { replace: true });
      clearSessions();
      setIsLoggingOut(false);
    }
  }

  if (!generalSession) {
    return (
      <Link
        className="flex h-11 items-center gap-2 rounded border border-slate-200 bg-white px-5 text-base font-bold text-indigo-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50"
        to={loginTo}
      >
        <LoginIcon />
        <span>{headerText.login}</span>
      </Link>
    );
  }

  return (
    <>
      {isServiceMaster(generalSession) ? (
        <Link
          className="flex h-11 items-center gap-2 rounded border border-violet-200 bg-violet-50 px-4 text-sm font-black text-violet-700 shadow-sm transition hover:bg-violet-100"
          to="/admin"
        >
          <AdminIcon />
          <span>{headerText.admin}</span>
        </Link>
      ) : null}
      <HeaderNotifications />
      <button
        className="flex h-11 items-center gap-2 rounded border border-slate-200 bg-white px-5 text-base font-bold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
        onClick={() => setIsAccountPanelOpen(true)}
        type="button"
      >
        <LoginIcon />
        <span>내 정보</span>
      </button>
      {isAccountPanelOpen ? (
        <div
          aria-labelledby="account-panel-title"
          aria-modal="true"
          className="fixed inset-0 z-[70] bg-slate-950/40"
          role="dialog"
        >
          <button
            aria-label="내 정보 닫기"
            className="absolute inset-0 size-full cursor-default"
            onClick={() => setIsAccountPanelOpen(false)}
            type="button"
          />
          <aside className="absolute top-0 right-0 grid h-full w-full max-w-md grid-rows-[auto_minmax(0,1fr)_auto] border-l border-slate-200 bg-white shadow-2xl">
            <header className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="grid min-w-0 gap-1">
                  <p className="text-xs font-black text-indigo-600 uppercase">
                    Account
                  </p>
                  <h2
                    className="text-xl font-black text-slate-950"
                    id="account-panel-title"
                  >
                    내 정보
                  </h2>
                </div>
                <button
                  className="h-9 rounded border border-slate-200 px-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                  onClick={() => setIsAccountPanelOpen(false)}
                  type="button"
                >
                  닫기
                </button>
              </div>
              <div className="mt-5 rounded border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-black text-slate-500">이메일</p>
                <p
                  className="mt-1 truncate text-sm font-black text-slate-950"
                  title={accountEmail}
                >
                  {accountEmail}
                </p>
              </div>
            </header>

            <div className="min-h-0 overflow-y-auto px-6 py-5">
              <div className="grid gap-5">
                <div className="grid gap-1">
                  <h3 className="text-base font-black text-slate-950">
                    내가 참가한 대회
                  </h3>
                  <p className="text-xs font-bold text-slate-500">
                    진행중, 예정, 종료 순서로 표시합니다.
                  </p>
                </div>

                {participantContestSections.map((section) =>
                  section.contests.length > 0 ? (
                    <section className="grid gap-2" key={section.key}>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-black text-slate-800">
                          {section.title}
                        </h4>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                          {section.contests.length}개
                        </span>
                      </div>
                      <div className="grid gap-2">
                        {section.contests.map((item) => (
                          <Link
                            className="grid gap-1 rounded border border-slate-200 px-3 py-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
                            key={item.contest.contest_id}
                            onClick={() => setIsAccountPanelOpen(false)}
                            to={`/contests/${item.contest.contest_id}`}
                          >
                            <span className="truncate text-sm font-black text-slate-950">
                              {item.contest.title}
                            </span>
                            <span className="truncate text-xs font-bold text-slate-500">
                              {item.division.name} · {item.team.team_name}
                            </span>
                            <span className="text-xs font-bold text-slate-400">
                              {formatContestMoment(item.contest.start_at)} -{' '}
                              {formatContestMoment(item.contest.end_at)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </section>
                  ) : null,
                )}

                {generalSession.participantContests.length === 0 ? (
                  <p className="rounded border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-bold text-slate-500">
                    참가 중인 대회가 없습니다.
                  </p>
                ) : null}
              </div>
            </div>

            <footer className="border-t border-slate-200 px-6 py-5">
              <button
                className="flex h-11 w-full items-center justify-center gap-2 rounded bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700 disabled:bg-slate-300"
                disabled={isLoggingOut}
                onClick={() => setIsLogoutConfirmOpen(true)}
                type="button"
              >
                <LogoutIcon />
                <span>
                  {isLoggingOut ? headerText.loggingOut : headerText.logout}
                </span>
              </button>
            </footer>
          </aside>
        </div>
      ) : null}
      {isLogoutConfirmOpen ? (
        <div
          aria-labelledby="logout-confirm-title"
          aria-modal="true"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 px-4"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <LogoutIcon />
              </span>
              <div className="grid gap-2">
                <h2
                  className="text-xl font-black text-slate-950"
                  id="logout-confirm-title"
                >
                  {headerText.logoutConfirmTitle}
                </h2>
                <p className="text-sm leading-6 font-medium text-slate-600">
                  {headerText.logoutConfirmDescription}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="h-10 rounded border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                disabled={isLoggingOut}
                onClick={() => setIsLogoutConfirmOpen(false)}
                type="button"
              >
                {headerText.logoutCancel}
              </button>
              <button
                className="h-10 rounded bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700 disabled:bg-slate-300"
                disabled={isLoggingOut}
                onClick={() => void handleLogout()}
                type="button"
              >
                {isLoggingOut
                  ? headerText.loggingOut
                  : headerText.logoutConfirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
