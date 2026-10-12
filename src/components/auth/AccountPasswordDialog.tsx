import { useEffect, useState } from 'react';
import ModalDialog, { ModalButton } from '@/shared/ui/ModalDialog';
import {
  getAccountPassword,
  requestAccountPassword,
  confirmAccountPassword,
} from '@/domains/identityAccess/accountPasswords';
import { formatUserApiError } from '@/shared/api/errors';
import {
  PasswordInput,
  PasswordRequirements,
  PasswordMatch,
} from './PasswordInput';
import { validNewPassword } from './passwordPolicy';

export default function AccountPasswordDialog({
  token,
  email: initialEmail,
  mode,
  onClose,
  onDone,
}: {
  token?: string;
  email: string;
  mode: 'set' | 'reset';
  onClose: () => void;
  onDone: (email: string) => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [hasPassword, setHasPassword] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentAt, setSentAt] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!token || mode !== 'set') return;
    let active = true;
    void getAccountPassword(token)
      .then((r) => {
        if (active) setHasPassword(r.has_password);
      })
      .catch((e) => {
        if (active)
          setError(
            formatUserApiError(e, '비밀번호 상태를 확인하지 못했습니다'),
          );
      });
    return () => {
      active = false;
    };
  }, [token, mode]);
  const cooldown = Math.max(0, 30 - Math.floor((clock - sentAt) / 1000));
  const expires = Math.max(0, 300 - Math.floor((clock - sentAt) / 1000));
  async function request() {
    setBusy(true);
    setError('');
    try {
      await requestAccountPassword(token, mode === 'reset' ? email : undefined);
      setSent(true);
      setCode('');
      setSentAt(Date.now());
      setClock(Date.now());
    } catch (e) {
      setError(formatUserApiError(e, '인증번호를 요청하지 못했습니다'));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!validNewPassword(password)) {
      setError('비밀번호 조건을 모두 충족해 주세요.');
      return;
    }
    if (password !== repeat) {
      setError('새 비밀번호가 서로 일치하지 않습니다.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await confirmAccountPassword(
        code,
        password,
        token,
        mode === 'reset' ? email : undefined,
      );
      setPassword('');
      setRepeat('');
      setCode('');
      onDone(email);
    } catch (e) {
      setError(formatUserApiError(e, '비밀번호를 변경하지 못했습니다'));
    } finally {
      setBusy(false);
    }
  }
  const fieldClass = 'rounded-lg border border-slate-200 px-3 py-2';
  return (
    <ModalDialog
      size="lg"
      closeOnBackdrop={false}
      eyebrow="ZOJ / ACCOUNT SECURITY"
      title={
        mode === 'reset'
          ? '비밀번호 찾기'
          : hasPassword
            ? '비밀번호 변경'
            : '비밀번호 등록'
      }
      onClose={busy ? undefined : onClose}
      description="ZOJ와 Editor가 함께 사용하는 비밀번호입니다. 이메일 인증 후 등록하거나 변경하세요."
      footer={
        <ModalButton disabled={busy} onClick={onClose}>
          닫기
        </ModalButton>
      }
    >
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void (sent ? save() : request());
        }}
      >
        <label className="grid gap-1 text-sm">
          이메일
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            readOnly={mode === 'set'}
            disabled={busy}
            onChange={(e) => {
              setEmail(e.target.value);
              setSent(false);
              setCode('');
              setPassword('');
              setRepeat('');
              setSentAt(0);
            }}
            className={fieldClass}
          />
        </label>
        {!sent ? (
          <>
            <p className="text-sm text-slate-500">
              {mode === 'reset'
                ? '비밀번호를 등록한 계정이라면 인증번호를 보내드립니다.'
                : hasPassword
                  ? '비밀번호 로그인을 사용 중입니다. 이메일 인증 후 변경할 수 있습니다.'
                  : '등록하면 다음 로그인부터 비밀번호를 사용할 수 있습니다.'}
            </p>
            <button
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={busy || !email}
            >
              {busy ? '요청 중…' : '이메일 인증번호 받기'}
            </button>
          </>
        ) : (
          <>
            <p
              role="status"
              className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-800"
            >
              등록된 이메일로 인증번호를 발송 요청했습니다.{' '}
              {expires > 0
                ? `남은 시간 ${Math.floor(expires / 60)}:${String(expires % 60).padStart(2, '0')}`
                : '인증번호가 만료되었습니다.'}
            </p>
            <label className="grid gap-1 text-sm">
              인증번호
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                disabled={busy}
                onChange={(e) => setCode(e.target.value)}
                className={fieldClass}
              />
            </label>
            <PasswordInput
              label="새 비밀번호"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              value={password}
              disabled={busy}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldClass}
            />
            <PasswordRequirements value={password} />
            <PasswordInput
              label="새 비밀번호 확인"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              value={repeat}
              disabled={busy}
              onChange={(e) => setRepeat(e.target.value)}
              className={fieldClass}
            />
            <PasswordMatch password={password} repeat={repeat} />
            <p className="text-xs leading-5 text-slate-500">
              변경하면 기존 로그인은 모두 해제됩니다. 이메일 인증번호 로그인도
              계속 사용할 수 있습니다.
            </p>
            <button
              disabled={
                busy ||
                expires <= 0 ||
                !validNewPassword(password) ||
                password !== repeat ||
                !/^[0-9]{6}$/.test(code)
              }
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy
                ? '저장 중…'
                : mode === 'reset'
                  ? '비밀번호 재설정'
                  : hasPassword
                    ? '비밀번호 변경'
                    : '비밀번호 등록'}
            </button>
            <button
              type="button"
              disabled={busy || cooldown > 0}
              onClick={() => void request()}
              className="text-sm text-indigo-600 disabled:text-slate-400"
            >
              {cooldown > 0
                ? `${cooldown}초 후 다시 받기`
                : '인증번호 다시 받기'}
            </button>
          </>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
      </form>
    </ModalDialog>
  );
}
