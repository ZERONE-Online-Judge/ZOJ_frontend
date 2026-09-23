import { hasParticipantPreviewAccess } from '@/domains/identityAccess/participantPreview';
import ModalDialog, { ModalButton } from '@/shared/ui/ModalDialog';
import { useEffect, useRef, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { z } from 'zod';
import PublicHero from '@/components/common/PublicHero';
import usePublicMotion from '@/shared/hooks/usePublicMotion';
import { ExperienceArrow } from '@/components/common/PublicExperience';
import './LoginPage.css';
import { loginGuideSections } from '@/data/loginGuideContent';
import { loginPageText } from '@/data/uiText';
import {
  requestGeneralOtp,
  verifyGeneralOtp,
} from '@/domains/identityAccess/api';
import { isServiceMaster } from '@/domains/identityAccess/permissions';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';
import type { GeneralSession } from '@/domains/identityAccess/types';
import {
  type ApiClientError,
  formatUserApiError,
  isApiClientError,
  readRetryAfterSeconds,
} from '@/shared/api/errors';
import { readLoginRedirectTarget } from '@/shared/lib/loginRedirect';
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

  if (
    targetContestId &&
    !hasParticipantPreviewAccess(session, targetContestId) &&
    !isParticipantContest &&
    (isOperatorContest || isServiceMaster(session))
  ) {
    return `/operator/contests/${encodeURIComponent(targetContestId)}`;
  }

  return target;
}

export default function LoginPage() {
  const motion = usePublicMotion();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const emailChanged = searchParams.get('reason') === 'email_changed';
  const changedEmail =
    emailChanged && typeof location.state?.emailChangedTo === 'string'
      ? location.state.emailChangedTo
      : '';
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
      : emailChanged
        ? '이메일을 변경했습니다. 새 이메일로 다시 로그인해 주세요.'
        : '',
  );
  const [messageStatus, setMessageStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >(() =>
    searchParams.get('reason') === 'session'
      ? 'error'
      : emailChanged
        ? 'ready'
        : 'idle',
  );
  const [email, setEmail] = useState(changedEmail);
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

  async function submitLogin(values: LoginFormValues, forceNewSession = false) {
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
        setMessage(
          '이미 사용 중인 세션이 있습니다. 이 브라우저에서 계속 사용할지 선택해 주세요.',
        );
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
    setMessage(
      '기존 세션을 유지했습니다. 이 브라우저에서는 로그인하지 않았습니다.',
    );
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
    <div
      className="public-experience login-experience"
      data-motion={motion.paused ? 'off' : 'on'}
    >
      {shouldShowContestLoginModal ? (
        <ModalDialog
          titleId="contest-login-required-title"
          title={loginPageText.contestRequiredTitle}
          onClose={closeContestLoginModal}
          footer={
            <ModalButton tone="primary" onClick={closeContestLoginModal}>
              {loginPageText.modalConfirm}
            </ModalButton>
          }
        >
          <p className="zoj-modal-copy">
            {loginPageText.contestRequiredDescription}
          </p>
        </ModalDialog>
      ) : null}

      {pendingSessionReplacement ? (
        <ModalDialog
          titleId="session-replacement-title"
          title="기존 로그인 연결을 끊을까요?"
          onClose={isSubmitting ? undefined : cancelSessionReplacement}
          footer={
            <>
              <ModalButton
                disabled={isSubmitting}
                onClick={cancelSessionReplacement}
              >
                이전 세션 유지
              </ModalButton>
              <ModalButton
                tone="primary"
                disabled={isSubmitting}
                onClick={confirmSessionReplacement}
              >
                이 브라우저에서 사용
              </ModalButton>
            </>
          }
        >
          <p className="zoj-modal-copy">
            이 계정은 이미 다른 브라우저 또는 기기에서 로그인 중입니다. 이
            브라우저에서 계속 사용하면 이전 세션은 로그아웃됩니다.
          </p>
          <div className="zoj-card mt-4 px-4 py-3 text-sm text-slate-600">
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
        </ModalDialog>
      ) : null}

      <PublicHero label="로그인" motion={motion} className="login-hero">
        <div className="experience-hero-grid">
          <div className="experience-hero-copy">
            <p className="experience-eyebrow">WELCOME TO YOUR NEXT CHALLENGE</p>
            <h1>
              반가워요.
              <br />
              다음 도전을
              <br className="login-title-break" /> 이어가요
              <span className="experience-lime">.</span>
            </h1>
            <p className="experience-lead">
              비밀번호 대신, 이메일 인증으로.
              <br />
              참가자도 운영자도 같은 곳에서 시작하세요.
            </p>
            <ol className="login-steps" aria-label="로그인 순서">
              <li
                className={!otpRequested ? 'is-current' : 'is-complete'}
                aria-current={!otpRequested ? 'step' : undefined}
              >
                <span>{otpRequested ? '✓' : '01'}</span>
                <div>
                  <strong>이메일 입력</strong>
                  <p>대회에 등록한 주소를 사용해 주세요.</p>
                </div>
              </li>
              <li
                className={otpRequested ? 'is-current' : ''}
                aria-current={otpRequested ? 'step' : undefined}
              >
                <span>02</span>
                <div>
                  <strong>인증번호 확인</strong>
                  <p>메일로 받은 번호로 로그인합니다.</p>
                </div>
              </li>
            </ol>
            <Link
              to="/support/help"
              className="experience-text-link login-help-link"
            >
              로그인에 도움이 필요하신가요? <ExperienceArrow />
            </Link>
          </div>
          <form
            className="login-card"
            aria-labelledby="login-card-title"
            onSubmit={(event) => {
              event.preventDefault();
              void submitLogin({ email, otpCode });
            }}
          >
            <div className="login-card-heading">
              <span className="login-step-label">
                STEP {otpRequested ? '02' : '01'} / 02
              </span>
              <h2 id="login-card-title">
                {otpRequested
                  ? '인증번호를 확인해 주세요.'
                  : '이메일로 시작하기'}
              </h2>
              <p>
                {otpRequested
                  ? '메일에 도착한 인증번호를 입력해 주세요.'
                  : '대회에 등록된 이메일로 인증번호를 보내드려요.'}
              </p>
            </div>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-800">
                {loginPageText.emailLabel}
              </span>
              <input
                autoComplete="email"
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'login-email-error' : undefined}
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
              <p
                id="login-email-error"
                role="alert"
                className="text-sm font-medium text-red-700"
              >
                {emailError}
              </p>
            )}

            <button
              className={
                otpRequested ? 'login-action is-secondary' : 'login-action'
              }
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
                : otpRequested
                  ? '인증번호 다시 받기'
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
                    inputMode="numeric"
                    disabled={isSubmitting}
                    className="focus:border-zoj-blue h-12 w-full rounded border border-slate-300 px-4 text-base transition outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder={loginPageText.otpPlaceholder}
                    ref={otpInputRef}
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value)}
                  />
                </label>
                <button
                  className="login-action"
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
                  {isSubmitting
                    ? loginPageText.loginSubmitting
                    : loginPageText.loginButton}
                </button>
                <p className="login-expiry">
                  {loginPageText.otpExpiryLabel}:{' '}
                  {otpExpiresSeconds > 0
                    ? formatSeconds(otpExpiresSeconds)
                    : loginPageText.otpExpiredLabel}
                </p>
              </>
            )}

            <PageNotice message={message} status={messageStatus} />
            <p className="login-spam-help">{loginPageText.spamHelp}</p>
          </form>
        </div>
      </PublicHero>
      <section
        className="experience-container login-help"
        aria-labelledby="login-help-title"
      >
        <div>
          <p className="experience-eyebrow">A LITTLE HELP</p>
          <h2 id="login-help-title">로그인 전에 알아두세요.</h2>
          <p>
            처음 방문하셨나요?
            <br />
            궁금한 내용을 펼쳐 확인해 보세요.
          </p>
        </div>
        <div className="login-help-details">
          {loginGuideSections.map((section) => (
            <details key={section.title}>
              <summary>
                {section.title}
                <span aria-hidden="true">+</span>
              </summary>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </details>
          ))}
          <Link to="/support/contact" className="experience-text-link">
            해결되지 않았다면, 서비스 문의 <ExperienceArrow />
          </Link>
        </div>
      </section>
    </div>
  );
}
