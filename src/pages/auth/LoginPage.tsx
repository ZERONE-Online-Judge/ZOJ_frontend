import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import PageLayout from '@/components/common/PageLayout';
import { loginGuideSections } from '@/data/loginGuideContent';
import { loginPageText } from '@/data/uiText';
import {
  requestGeneralOtp,
  verifyGeneralOtp,
} from '@/domains/identityAccess/api';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';
import type { GeneralSession } from '@/domains/identityAccess/types';
import {
  type ApiClientError,
  formatUserApiError,
  isApiClientError,
  readRetryAfterSeconds,
} from '@/shared/api/errors';
import { readLoginRedirectTarget } from '@/shared/lib/loginRedirect';
import ModalPortal from '@/shared/ui/ModalPortal';
import PageNotice from '@/shared/ui/PageNotice';

const OTP_VALID_SECONDS = 5 * 60;

const loginSchema = z.object({
  email: z.email(loginPageText.emailValidation),
  otpCode: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type PendingSessionReplacement = {
  activeSessionCount: number;
  email: string;
  lastSeenAt?: string | null;
  otpCode: string;
} | null;

function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function currentTimestamp() {
  return new Date().getTime();
}

function formatLoginError(error: unknown) {
  if (
    isApiClientError(error) &&
    error.status === 401 &&
    error.code === 'invalid_credentials'
  ) {
    return loginPageText.invalidCredentials;
  }

  return formatUserApiError(error, loginPageText.loginFailed);
}

function isUnregisteredEmailError(error: unknown) {
  if (!isApiClientError(error)) return false;

  const code = error.code.toLowerCase();
  const message = error.message.toLowerCase();
  const notFoundCodes = new Set([
    'account_not_found',
    'email_not_found',
    'email_not_registered',
    'general_account_not_found',
    'not_found',
    'user_not_found',
  ]);

  return (
    error.status === 404 ||
    notFoundCodes.has(code) ||
    code.includes('not_found') ||
    code.includes('not_registered') ||
    message.includes('not registered') ||
    message.includes('not found') ||
    message.includes('no account')
  );
}

function isSessionConflictError(error: unknown): error is ApiClientError {
  return (
    isApiClientError(error) &&
    error.status === 409 &&
    error.code === 'session_conflict'
  );
}

function sessionConflictDetails(error: unknown) {
  if (!isSessionConflictError(error)) {
    return { activeSessionCount: 1, lastSeenAt: null };
  }

  const activeSessionCount = error.details?.active_session_count;
  const lastSeenAt = error.details?.last_seen_at;
  return {
    activeSessionCount:
      typeof activeSessionCount === 'number' ? activeSessionCount : 1,
    lastSeenAt: typeof lastSeenAt === 'string' ? lastSeenAt : null,
  };
}

function contestIdFromParticipantPath(path: string | null) {
  const match = path?.match(/^\/contests\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function postLoginRedirectPath(
  session: GeneralSession,
  searchParams: URLSearchParams,
) {
  const contestId = searchParams.get('contestId');
  const moveTo = readLoginRedirectTarget(searchParams);
  const fallback = contestId
    ? `/contests/${encodeURIComponent(contestId)}`
    : '/';
  const target = moveTo ?? fallback;
  const targetContestId = contestIdFromParticipantPath(target) ?? contestId;
  const isParticipantContest = session.participantContests.some(
    (item) => item.contest.contest_id === targetContestId,
  );
  const isOperatorContest = session.operatorContests.some(
    (item) => item.contest.contest_id === targetContestId,
  );

  if (targetContestId && isOperatorContest && !isParticipantContest) {
    return `/operator/contests/${encodeURIComponent(targetContestId)}`;
  }

  return target;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const setGeneralSession = useSessionStore((state) => state.setGeneralSession);
  const setParticipantSession = useSessionStore(
    (state) => state.setParticipantSession,
  );
  const generalSession = useSessionStore((state) => state.generalSession);
  const [otpRequested, setOtpRequested] = useState(false);
  const [requestedOtpEmail, setRequestedOtpEmail] = useState('');
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [otpExpiresAt, setOtpExpiresAt] = useState(0);
  const [message, setMessage] = useState(() =>
    searchParams.get('reason') === 'session'
      ? '로그인 세션이 만료되었거나 다른 위치에서 해제되었습니다. 다시 로그인해 주세요.'
      : '',
  );
  const [messageStatus, setMessageStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >(() => (searchParams.get('reason') === 'session' ? 'error' : 'idle'));
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingSessionReplacement, setPendingSessionReplacement] =
    useState<PendingSessionReplacement>(null);
  const [now, setNow] = useState(currentTimestamp);
  const otpInputRef = useRef<HTMLInputElement | null>(null);

  const shouldShowContestLoginModal = searchParams.get('reason') === 'contest';
  const cooldownSeconds = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const otpExpiresSeconds = Math.max(0, Math.ceil((otpExpiresAt - now) / 1000));
  const canRequestOtp =
    Boolean(email.trim()) && cooldownSeconds <= 0 && !isSubmitting;
  useEffect(() => {
    const timer = window.setInterval(() => setNow(currentTimestamp()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!otpRequested) return;

    otpInputRef.current?.focus();
  }, [otpRequested]);

  useEffect(() => {
    if (!generalSession || isSubmitting || pendingSessionReplacement) return;

    navigate(postLoginRedirectPath(generalSession, searchParams), {
      replace: true,
    });
  }, [
    generalSession,
    isSubmitting,
    navigate,
    pendingSessionReplacement,
    searchParams,
  ]);

  function validateEmail() {
    const parsed = loginSchema.safeParse({ email, otpCode });
    if (parsed.success) {
      setEmailError('');
      return true;
    }

    const issue = parsed.error.issues.find((item) =>
      item.path.includes('email'),
    );
    setEmailError(issue?.message ?? loginPageText.emailValidation);
    return false;
  }

  function resetOtpAfterEmailChange() {
    setOtpRequested(false);
    setRequestedOtpEmail('');
    setOtpExpiresAt(0);
    setCooldownUntil(0);
    setOtpCode('');
    setMessage(loginPageText.emailChanged);
    setMessageStatus('idle');
  }

  async function requestOtp() {
    if (!validateEmail()) return;

    const requestedEmail = email.trim();

    setMessage(loginPageText.otpRequesting);
    setMessageStatus('loading');
    setIsSubmitting(true);

    try {
      const response = await requestGeneralOtp(requestedEmail);
      const cooldown =
        response.cooldown_seconds > 0 ? response.cooldown_seconds : 10;
      const requestedAt = currentTimestamp();

      setOtpCode('');
      setOtpRequested(true);
      setRequestedOtpEmail(requestedEmail);
      setCooldownUntil(requestedAt + cooldown * 1000);
      setOtpExpiresAt(requestedAt + OTP_VALID_SECONDS * 1000);
      setMessage(loginPageText.otpSent);
      setMessageStatus('ready');
    } catch (error) {
      const retryAfter = readRetryAfterSeconds(error);

      if (retryAfter > 0) {
        setCooldownUntil(currentTimestamp() + retryAfter * 1000);
      }

      setMessage(
        isUnregisteredEmailError(error)
          ? loginPageText.unregisteredEmail
          : formatUserApiError(error, loginPageText.otpRequestFailed),
      );
      setMessageStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitLogin(
    values: LoginFormValues,
    forceNewSession = false,
  ) {
    if (!validateEmail()) return;

    if (!otpRequested) {
      await requestOtp();
      return;
    }

    if (!values.otpCode?.trim()) {
      setMessage(loginPageText.otpRequired);
      setMessageStatus('error');
      return;
    }

    if (otpExpiresSeconds <= 0) {
      setMessage(loginPageText.otpExpired);
      setMessageStatus('error');
      return;
    }

    setMessage(loginPageText.loginSubmitting);
    setMessageStatus('loading');
    setIsSubmitting(true);

    try {
      const session = await verifyGeneralOtp(
        requestedOtpEmail || values.email.trim(),
        values.otpCode.trim(),
        generalSession,
        forceNewSession,
      );

      setPendingSessionReplacement(null);
      setGeneralSession(session);
      setParticipantSession(null);
      setMessage(loginPageText.loginReady);
      setMessageStatus('ready');
      setOtpRequested(false);
      setRequestedOtpEmail('');
      setOtpExpiresAt(0);
      setOtpCode('');
      navigate(postLoginRedirectPath(session, searchParams), { replace: true });
    } catch (error) {
      if (!forceNewSession && isSessionConflictError(error)) {
        const details = sessionConflictDetails(error);
        setPendingSessionReplacement({
          activeSessionCount: details.activeSessionCount,
          email: requestedOtpEmail || values.email.trim(),
          lastSeenAt: details.lastSeenAt,
          otpCode: values.otpCode.trim(),
        });
        setMessage('이미 사용 중인 세션이 있습니다. 이 브라우저에서 계속 사용할지 선택해 주세요.');
        setMessageStatus('error');
        return;
      }
      setMessage(formatLoginError(error));
      setMessageStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  }

  function cancelSessionReplacement() {
    setPendingSessionReplacement(null);
    setMessage('기존 세션을 유지했습니다. 이 브라우저에서는 로그인하지 않았습니다.');
    setMessageStatus('idle');
  }

  function confirmSessionReplacement() {
    if (!pendingSessionReplacement) return;
    void submitLogin(
      {
        email: pendingSessionReplacement.email,
        otpCode: pendingSessionReplacement.otpCode,
      },
      true,
    );
  }

  function closeContestLoginModal() {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('reason');
    setSearchParams(nextParams, { replace: true });
  }

  return (
    <PageLayout
      description={loginPageText.description}
      eyebrow={loginPageText.eyebrow}
      title={loginPageText.title}
      width="7xl"
    >
      {shouldShowContestLoginModal ? (
        <ModalPortal>
          <div
            aria-labelledby="contest-login-required-title"
            aria-modal="true"
            className="fixed inset-0 z-[60] flex min-h-dvh items-center justify-center bg-slate-950/50 px-4"
            role="dialog"
          >
            <div className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-xl">
              <div className="flex items-start gap-4">
                <span className="text-zoj-blue flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
                  <svg
                    aria-hidden="true"
                    className="size-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 1.5 17 4v5.25c0 4.12-2.96 7.94-7 9.25-4.04-1.31-7-5.13-7-9.25V4l7-2.5Zm0 4.5a.75.75 0 0 0-.75.75v3.5c0 .41.34.75.75.75s.75-.34.75-.75v-3.5A.75.75 0 0 0 10 6Zm0 7.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
                  </svg>
                </span>
                <div className="grid gap-2">
                  <h2
                    id="contest-login-required-title"
                    className="text-xl font-black text-slate-950"
                  >
                    {loginPageText.contestRequiredTitle}
                  </h2>
                  <p className="text-sm leading-6 text-slate-600">
                    {loginPageText.contestRequiredDescription}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  className="h-10 rounded border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                  onClick={closeContestLoginModal}
                  type="button"
                >
                  {loginPageText.modalConfirm}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}

      {pendingSessionReplacement ? (
        <ModalPortal>
          <div
            aria-labelledby="session-replacement-title"
            aria-modal="true"
            className="fixed inset-0 z-[70] flex min-h-dvh items-center justify-center bg-slate-950/50 px-4"
            role="dialog"
          >
            <div className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-xl">
              <div className="grid gap-2">
                <h2
                  className="text-xl font-black text-slate-950"
                  id="session-replacement-title"
                >
                  기존 로그인 연결을 끊을까요?
                </h2>
                <p className="text-sm leading-6 text-slate-600">
                  이 계정은 이미 다른 브라우저 또는 기기에서 로그인 중입니다.
                  이 브라우저에서 계속 사용하면 이전 세션은 로그아웃됩니다.
                </p>
                <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                  활성 세션 {pendingSessionReplacement.activeSessionCount}개
                  {pendingSessionReplacement.lastSeenAt ? (
                    <>
                      {' · 마지막 사용 '}
                      {new Intl.DateTimeFormat('ko-KR', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(pendingSessionReplacement.lastSeenAt))}
                    </>
                  ) : null}
                </div>
              </div>
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  className="h-10 rounded border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                  disabled={isSubmitting}
                  onClick={cancelSessionReplacement}
                  type="button"
                >
                  이전 세션 유지
                </button>
                <button
                  className="bg-zoj-blue h-10 rounded px-4 text-sm font-black text-white transition hover:bg-blue-700 disabled:bg-slate-300"
                  disabled={isSubmitting}
                  onClick={confirmSessionReplacement}
                  type="button"
                >
                  이 브라우저에서 사용
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(22rem,32rem)_minmax(20rem,1fr)]">
        <form
          className="grid min-w-0 gap-5 rounded-md border border-slate-200 bg-white p-6 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            void submitLogin({ email, otpCode });
          }}
        >
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-800">
              {loginPageText.emailLabel}
            </span>
            <input
              autoComplete="email"
              className="focus:border-zoj-blue h-12 w-full rounded border border-slate-300 px-4 text-base transition outline-none focus:ring-2 focus:ring-blue-100"
              disabled={isSubmitting}
              placeholder={loginPageText.emailPlaceholder}
              type="email"
              value={email}
              onChange={(event) => {
                const nextEmail = event.target.value;
                setEmail(nextEmail);
                if (emailError) setEmailError('');
                if (
                  otpRequested &&
                  requestedOtpEmail &&
                  nextEmail.trim() !== requestedOtpEmail
                ) {
                  resetOtpAfterEmailChange();
                }
              }}
            />
          </label>
          {emailError && (
            <p className="text-sm font-medium text-red-700">
              {emailError}
            </p>
          )}

          <button
            className="bg-zoj-blue flex h-12 w-full items-center justify-center gap-2 rounded px-5 text-base font-bold text-white transition hover:bg-blue-700 disabled:bg-slate-300"
            disabled={!canRequestOtp}
            onClick={otpRequested ? requestOtp : undefined}
            type={otpRequested ? 'button' : 'submit'}
          >
            <svg
              aria-hidden="true"
              className="size-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2.5 5A2.5 2.5 0 0 1 5 2.5h10A2.5 2.5 0 0 1 17.5 5v10a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 15V5Zm2.2-.5 5.3 4.25L15.3 4.5H4.7Zm10.8 2.1-5.03 4.03a.75.75 0 0 1-.94 0L4.5 6.6V15c0 .28.22.5.5.5h10a.5.5 0 0 0 .5-.5V6.6Z" />
            </svg>
            {cooldownSeconds > 0
              ? `${loginPageText.cooldownLabel} ${cooldownSeconds}초`
              : loginPageText.otpRequestButton}
          </button>

          {otpRequested && (
            <>
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-800">
                  {loginPageText.otpLabel}
                </span>
                <input
                  autoComplete="one-time-code"
                  className="focus:border-zoj-blue h-12 w-full rounded border border-slate-300 px-4 text-base transition outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder={loginPageText.otpPlaceholder}
                  ref={otpInputRef}
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value)}
                />
              </label>
              <button
                className="hover:border-zoj-blue hover:text-zoj-blue flex h-12 w-full items-center justify-center gap-2 rounded border border-slate-300 bg-white px-5 text-base font-bold text-slate-950 transition disabled:text-slate-400"
                disabled={isSubmitting || otpExpiresSeconds <= 0}
                type="submit"
              >
                <svg
                  aria-hidden="true"
                  className="size-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 1.5 17 4v5.25c0 4.12-2.96 7.94-7 9.25-4.04-1.31-7-5.13-7-9.25V4l7-2.5Zm3.53 6.97a.75.75 0 0 0-1.06-1.06L9 10.88 7.53 9.41a.75.75 0 0 0-1.06 1.06l2 2c.3.3.77.3 1.06 0l4-4Z" />
                </svg>
                {loginPageText.loginButton}
              </button>
              <p className="text-sm font-medium text-slate-500">
                {loginPageText.otpExpiryLabel}:{' '}
                {otpExpiresSeconds > 0
                  ? formatSeconds(otpExpiresSeconds)
                  : loginPageText.otpExpiredLabel}
              </p>
            </>
          )}

          <PageNotice message={message} status={messageStatus} />
          <p className="text-center text-xs font-medium text-slate-400">
            {loginPageText.spamHelp}
          </p>
        </form>

        <aside className="grid min-w-0 content-start gap-4 rounded-md border border-slate-200 bg-slate-50 p-6">
          {loginGuideSections.map((section) => (
            <section
              className="rounded border border-slate-200 bg-white p-5"
              key={section.title}
            >
              <h2 className="text-base font-black text-slate-950">
                {section.title}
              </h2>
              <ul className="mt-3 grid list-disc gap-2 pl-5 text-sm leading-6 text-slate-700">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </aside>
      </div>
    </PageLayout>
  );
}
