import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react';
import Modal from '@/shared/ui/Modal';

type ModalDialogProps = {
  title: ReactNode;
  titleId?: string;
  'aria-label'?: string;
  eyebrow?: string;
  description?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  headerActions?: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'wide';
  fill?: boolean;
  drawer?: boolean;
  customBody?: boolean;
  className?: string;
};

/** Shared appearance; Modal owns focus, stacking, dismissal and scroll locks. */
export default function ModalDialog({
  title,
  titleId,
  'aria-label': ariaLabel,
  eyebrow,
  description,
  icon,
  children,
  footer,
  headerActions,
  onClose,
  closeLabel = '닫기',
  size = 'sm',
  fill = false,
  drawer = false,
  customBody = false,
  className = '',
}: ModalDialogProps) {
  const generatedId = useId();
  const headingId = titleId ?? `${generatedId}-title`;
  const descriptionId = `${generatedId}-description`;

  return (
    <Modal
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : headingId}
      aria-describedby={description ? descriptionId : undefined}
      drawer={drawer}
      onClose={onClose}
    >
      <section
        className={`zoj-modal-shell ${className}`}
        data-size={size}
        data-fill={fill || drawer || undefined}
      >
        <header className="zoj-modal-header">
          {icon ? <span className="zoj-modal-icon">{icon}</span> : null}
          <div className="zoj-modal-heading">
            {eyebrow ? <p className="zoj-modal-eyebrow">{eyebrow}</p> : null}
            <h2 id={headingId}>{title}</h2>
            {description ? (
              <p className="zoj-modal-description" id={descriptionId}>
                {description}
              </p>
            ) : null}
          </div>
          {headerActions || onClose ? (
            <div className="zoj-modal-header-actions">
              {headerActions}
              {onClose ? (
                <button
                  aria-label={closeLabel}
                  className="zoj-modal-close"
                  onClick={onClose}
                  type="button"
                >
                  <svg
                    aria-hidden="true"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  >
                    <path d="m6 6 12 12M18 6 6 18" />
                  </svg>
                  <span className="sr-only">{closeLabel}</span>
                </button>
              ) : null}
            </div>
          ) : null}
        </header>
        {children ? (
          <div
            className={`zoj-modal-body ${customBody ? 'zoj-modal-body--custom' : ''}`}
          >
            {children}
          </div>
        ) : null}
        {footer ? <footer className="zoj-modal-footer">{footer}</footer> : null}
      </section>
    </Modal>
  );
}

export function ModalButton({
  tone = 'secondary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'secondary' | 'primary' | 'danger';
}) {
  return (
    <button
      {...props}
      type={type}
      className={`zoj-modal-action ${className}`}
      data-tone={tone}
    />
  );
}
