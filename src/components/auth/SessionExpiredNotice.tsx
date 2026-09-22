import Modal from '@/shared/ui/Modal';

export default function SessionExpiredNotice({
  onHome,
  onLogin,
}: {
  onHome: () => void;
  onLogin: () => void;
}) {
  return (
    <Modal aria-labelledby="session-expired-title">
      <section className="relative max-h-[var(--zoj-modal-height)] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl bg-white px-6 py-9 text-center shadow-2xl sm:px-10 sm:py-11">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-violet-500" />
        <div className="mx-auto mb-7 flex size-20 items-center justify-center rounded-3xl bg-violet-50 text-violet-600">
          <svg
            aria-hidden="true"
            width="38"
            height="38"
            viewBox="0 0 32 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 14V9a7 7 0 0 1 14 0v5" />
            <rect x="5" y="14" width="22" height="16" rx="5" />
            <path d="M16 20v4" />
          </svg>
        </div>
        <p className="mb-3 text-xs font-bold tracking-[0.16em] text-violet-600">
          SESSION EXPIRED
        </p>
        <h2
          id="session-expired-title"
          className="text-2xl font-bold tracking-tight text-slate-950"
        >
          세션이 만료되었습니다
        </h2>
        <p className="mt-4 text-sm leading-7 break-keep text-slate-500">
          로그인 유지 시간이 지났거나
          <br />
          다른 기기에서 로그인하여 연결이 종료되었습니다.
          <br />
          계속 이용하려면 다시 로그인해 주세요.
        </p>
        <div className="mt-8 grid gap-3">
          <button
            className="min-h-12 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600"
            onClick={onHome}
            type="button"
          >
            메인으로 돌아가기 <span aria-hidden="true">↗</span>
          </button>
          <button
            className="min-h-12 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            onClick={onLogin}
            type="button"
          >
            다시 로그인
          </button>
        </div>
      </section>
    </Modal>
  );
}
