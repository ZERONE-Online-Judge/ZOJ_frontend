import { useEffect, useRef, type ReactNode } from 'react';
import ModalPortal from '@/shared/ui/ModalPortal';

type ModalProps = {
  children: ReactNode;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  onClose?: () => void;
  drawer?: boolean;
};

const scrollLocks = new Set<symbol>();
let previousOverflow = '';
let previousPadding = '';

function lockPageScroll() {
  const key = Symbol();
  if (!scrollLocks.size) {
    previousOverflow = document.body.style.overflow;
    previousPadding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbar > 0) {
      const padding =
        Number.parseFloat(
          window.getComputedStyle(document.body).paddingRight,
        ) || 0;
      document.body.style.paddingRight = `${padding + scrollbar}px`;
    }
    document.body.style.overflow = 'hidden';
  }
  scrollLocks.add(key);
  return () => {
    scrollLocks.delete(key);
    if (!scrollLocks.size) {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
    }
  };
}

/** The native top layer keeps nested dialogs focused and above transformed panels. */
export default function Modal({
  children,
  onClose,
  drawer = false,
  ...label
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const backdropPointerDown = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const trigger = document.activeElement;
    const unlock = lockPageScroll();
    dialog.showModal();
    // Start at the dialog heading instead of activating a destructive action.
    dialog.focus({ preventScroll: true });
    return () => {
      dialog.close();
      unlock();
      if (trigger instanceof window.HTMLElement && trigger.isConnected) {
        trigger.focus({ preventScroll: true });
      }
    };
  }, []);

  return (
    <ModalPortal>
      <dialog
        {...label}
        aria-modal="true"
        className="zoj-dialog"
        onCancel={(event) => {
          event.preventDefault();
          onClose?.();
        }}
        ref={ref}
        tabIndex={-1}
      >
        <div
          className={
            drawer
              ? 'zoj-modal-backdrop zoj-modal-drawer'
              : 'zoj-modal-backdrop'
          }
          onPointerDown={(event) => {
            backdropPointerDown.current = event.target === event.currentTarget;
          }}
          onClick={(event) => {
            if (
              backdropPointerDown.current &&
              event.target === event.currentTarget
            )
              onClose?.();
            backdropPointerDown.current = false;
          }}
        >
          {children}
        </div>
      </dialog>
    </ModalPortal>
  );
}
