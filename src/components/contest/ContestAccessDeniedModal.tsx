import { accessText, loginPageText } from '@/data/uiText';
import { SvgIcon } from '@/utils/Icons';

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
            <SvgIcon name="alert" size={20} />
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
