import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { headerText } from '@/data/uiText';
import { logoutGeneral } from '@/domains/identityAccess/api';
import { isServiceMaster } from '@/domains/identityAccess/permissions';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';

type HeaderAuthControlsProps = {
  loginTo: string;
  teamName?: string | null;
};

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

function OperatorIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
      <path
        d="M4.5 5.5h11M4.5 10h11M4.5 14.5h7M3 3.75h14v12.5H3V3.75Z"
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
  teamName,
}: HeaderAuthControlsProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const generalSession = useSessionStore((state) => state.generalSession);
  const clearSessions = useSessionStore((state) => state.clearSessions);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const accountEmail = generalSession?.account.email;

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
      setIsLogoutConfirmOpen(false);
      clearSessions();
      queryClient.clear();
      setIsLoggingOut(false);
      navigate('/');
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
      {generalSession.operatorSession ? (
        <Link
          className="flex h-11 items-center gap-2 rounded border border-indigo-200 bg-indigo-50 px-4 text-sm font-black text-indigo-700 shadow-sm transition hover:bg-indigo-100"
          to="/operator"
        >
          <OperatorIcon />
          <span>{headerText.operator}</span>
        </Link>
      ) : null}
      {isServiceMaster(generalSession) ? (
        <Link
          className="flex h-11 items-center gap-2 rounded border border-violet-200 bg-violet-50 px-4 text-sm font-black text-violet-700 shadow-sm transition hover:bg-violet-100"
          to="/admin"
        >
          <AdminIcon />
          <span>{headerText.admin}</span>
        </Link>
      ) : null}
      <div className="grid max-w-48 justify-items-end text-right leading-tight">
        {teamName ? (
          <span
            className="max-w-full truncate text-sm font-bold text-slate-600"
            title={teamName}
          >
            {teamName}
          </span>
        ) : accountEmail ? (
          <span
            className="max-w-full truncate text-xs font-bold text-slate-400"
            title={accountEmail}
          >
            {accountEmail}
          </span>
        ) : null}
      </div>
      <button
        className="flex h-11 items-center gap-2 rounded border border-slate-200 bg-white px-5 text-base font-bold text-slate-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:text-slate-400"
        disabled={isLoggingOut}
        onClick={() => setIsLogoutConfirmOpen(true)}
        type="button"
      >
        <LogoutIcon />
        <span>{isLoggingOut ? headerText.loggingOut : headerText.logout}</span>
      </button>
      {isLogoutConfirmOpen ? (
        <div
          aria-labelledby="logout-confirm-title"
          aria-modal="true"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 px-4"
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
