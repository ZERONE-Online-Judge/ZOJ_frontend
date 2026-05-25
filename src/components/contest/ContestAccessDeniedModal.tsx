import { Link } from 'react-router-dom';
import { accessText, loginPageText } from '@/data/uiText';
import ModalPortal from '@/shared/ui/ModalPortal';
import { SvgIcon } from '@/utils/Icons';

type ContestAccessDeniedModalProps = {
  loginTo?: string;
  onClose: () => void;
};

export default function ContestAccessDeniedModal({
  loginTo,
  onClose,
}: ContestAccessDeniedModalProps) {
  return (
    <ModalPortal>
      <div
        aria-labelledby="contest-access-denied-title"
        aria-modal="true"
        className="fixed inset-0 z-[60] flex min-h-dvh items-center justify-center bg-slate-950/50 px-4"
        role="dialog"
      >
        <div className="w-full max-w-lg rounded-md border border-slate-200 bg-white p-6 shadow-xl">
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
              <p className="text-sm leading-6 break-keep text-slate-600">
                {accessText.participantNoAccessDescription}
              </p>
              <p className="text-sm leading-6 break-keep text-slate-600">
                {accessText.participantNoAccessMessage}
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              className="h-10 rounded border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
              onClick={onClose}
              type="button"
            >
              {loginPageText.modalConfirm}
            </button>
            {loginTo ? (
              <Link
                className="bg-zoj-blue flex h-10 items-center rounded px-4 text-sm font-black text-white transition hover:bg-indigo-600"
                to={loginTo}
              >
                로그인
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
