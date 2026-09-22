import type { ReactNode } from 'react';
import Modal from '@/shared/ui/Modal';
import './HeaderPanels.css';

export type HeaderIconName =
  | 'user'
  | 'bell'
  | 'close'
  | 'logout'
  | 'admin'
  | 'answer'
  | 'submission'
  | 'contest';
const paths: Record<HeaderIconName, string> = {
  user: 'M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM5 20v-2a7 7 0 0 1 14 0v2',
  bell: 'M18 8a6 6 0 0 0-12 0v5l-2 4h16l-2-4V8ZM10 21h4',
  close: 'm6 6 12 12M18 6 6 18',
  logout: 'M10 4H5v16h5M14 8l4 4-4 4M9 12h10',
  admin: 'M4 10 12 3l8 7v10H4V10ZM9 20v-7h6v7',
  answer: 'M4 4h16v12H9l-5 4V4ZM8 8h8M8 12h5',
  submission: 'm8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16',
  contest:
    'M8 3h8v5a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 4 4M16 5h4v2a4 4 0 0 1-4 4M12 12v6M8 21h8M9 18h6',
};
export function HeaderIcon({ name }: { name: HeaderIconName }) {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export default function HeaderPanel({
  id,
  title,
  label,
  description,
  icon,
  onClose,
  children,
  footer,
}: {
  id: string;
  title: string;
  label: string;
  description: string;
  icon: HeaderIconName;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Modal aria-labelledby={id} onClose={onClose} drawer>
      <button
        className="header-panel-backdrop"
        aria-label={`${title} 닫기`}
        onClick={onClose}
        type="button"
        tabIndex={-1}
      />
      <aside className="header-panel">
        <header className="header-panel-heading">
          <div className="header-panel-topline">
            <span>ZOJ / {label}</span>
            <button
              className="header-icon-button"
              aria-label={`${title} 닫기`}
              onClick={onClose}
              type="button"
            >
              <HeaderIcon name="close" />
            </button>
          </div>
          <div className="header-panel-title">
            <span className="header-panel-symbol">
              <HeaderIcon name={icon} />
            </span>
            <h2 id={id}>{title}</h2>
          </div>
          <p>{description}</p>
        </header>
        <div className="header-panel-body">{children}</div>
        {footer ? (
          <footer className="header-panel-footer">{footer}</footer>
        ) : null}
      </aside>
    </Modal>
  );
}
