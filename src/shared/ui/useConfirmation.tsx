import { useCallback, useEffect, useId, useRef, useState } from 'react';
import ModalDialog, { ModalButton } from '@/shared/ui/ModalDialog';

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
    <ModalDialog
      titleId={titleId}
      title={request.title ?? '삭제 확인'}
      onClose={() => finish(false)}
      footer={
        <>
          <ModalButton onClick={() => finish(false)}>취소</ModalButton>
          <ModalButton
            tone={request.tone ?? 'danger'}
            onClick={() => finish(true)}
          >
            {request.confirmLabel ?? '삭제'}
          </ModalButton>
        </>
      }
    >
      <p className="zoj-modal-copy">{request.message}</p>
    </ModalDialog>
  ) : null;

  return { confirm, dialog };
}
