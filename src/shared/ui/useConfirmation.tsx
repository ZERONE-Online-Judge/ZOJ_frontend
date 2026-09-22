import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Modal from '@/shared/ui/Modal';

type ConfirmationOptions = {
  title?: string;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
};

type Request = ConfirmationOptions & { message: string };

export default function useConfirmation() {
  const [request, setRequest] = useState<Request | null>(null);
  const resolve = useRef<((value: boolean) => void) | null>(null);
  const titleId = useId();

  useEffect(() => () => resolve.current?.(false), []);

  const confirm = useCallback(
    (message: string, options: ConfirmationOptions = {}) => {
      resolve.current?.(false);
      return new Promise<boolean>((done) => {
        resolve.current = done;
        setRequest({ message, ...options });
      });
    },
    [],
  );

  function finish(accepted: boolean) {
    const done = resolve.current;
    resolve.current = null;
    setRequest(null);
    done?.(accepted);
  }

  const dialog = request ? (
    <Modal aria-labelledby={titleId} onClose={() => finish(false)}>
      <section className="zoj-modal-card max-w-md p-5 sm:p-6">
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          {request.title ?? '삭제 확인'}
        </h2>
        <p className="mt-3 text-sm leading-6 break-words whitespace-pre-wrap text-slate-600">
          {request.message}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
            onClick={() => finish(false)}
          >
            취소
          </button>
          <button
            type="button"
            className={`h-10 rounded-lg px-4 text-sm font-medium text-white ${request.tone === 'primary' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700'}`}
            onClick={() => finish(true)}
          >
            {request.confirmLabel ?? '삭제'}
          </button>
        </div>
      </section>
    </Modal>
  ) : null;

  return { confirm, dialog };
}
