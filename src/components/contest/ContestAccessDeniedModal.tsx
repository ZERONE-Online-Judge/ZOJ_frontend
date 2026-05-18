import { accessText, loginPageText } from '@/data/uiText';

type ContestAccessDeniedModalProps = {
  onClose: () => void;
};

export default function ContestAccessDeniedModal({
  onClose,
}: ContestAccessDeniedModalProps) {
  return (
    <div
      aria-labelledby="contest-access-denied-title"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 px-4"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
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
              className="text-xl font-black text-slate-950"
              id="contest-access-denied-title"
            >
              {accessText.participantNoAccessTitle}
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              {accessText.participantNoAccessDescription}
            </p>
            <p className="text-sm leading-6 text-slate-600">
              {accessText.participantNoAccessMessage}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            className="h-10 rounded border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            {loginPageText.modalConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
