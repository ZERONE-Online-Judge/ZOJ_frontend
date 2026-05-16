import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import PageLayout from '@/components/common/PageLayout';
import type { StaffSession } from '@/domains/identityAccess/types';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';

type OperatorAccessGateProps = {
  children: (session: StaffSession) => ReactNode;
};

type OperatorTabsProps = {
  contestId?: string;
};

type OperatorPanelProps = {
  actions?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  title: string;
};

type OperatorMetricCardProps = {
  description?: ReactNode;
  icon: ReactNode;
  label: string;
  tone?: 'indigo' | 'cyan' | 'emerald' | 'amber' | 'slate';
  value: ReactNode;
};

const toneClassNames = {
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
} as const;

const operatorTabs = [
  { label: '운영 홈', path: '', icon: DashboardIcon, end: true },
  { label: '설정', path: 'settings', icon: SettingsIcon },
  { label: '공지', path: 'notices', icon: NoticeIcon },
  { label: '참가팀', path: 'participants', icon: TeamIcon },
  { label: '문제', path: 'problems', icon: ProblemIcon },
  { label: '제출', path: 'submissions', icon: JudgeIcon },
  { label: '스코어보드', path: 'scoreboard', icon: ScoreboardIcon },
] as const;

export function OperatorAccessGate({ children }: OperatorAccessGateProps) {
  const staffSession = useSessionStore(
    (state) => state.generalSession?.operatorSession,
  );

  if (!staffSession) {
    return (
      <PageLayout
        description="대회 운영 기능은 운영자 권한이 있는 계정으로 로그인해야 사용할 수 있습니다."
        title="운영자 로그인 필요"
      >
        <Link
          className="w-fit rounded border border-indigo-200 bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700"
          to="/login"
        >
          로그인 페이지로 이동
        </Link>
      </PageLayout>
    );
  }

  return children(staffSession);
}

export function OperatorTabs({ contestId }: OperatorTabsProps) {
  if (!contestId) return null;
  const basePath = `/operator/contests/${contestId}`;

  return (
    <nav aria-label="운영자 메뉴" className="flex flex-wrap gap-2">
      {operatorTabs.map((tab) => {
        const Icon = tab.icon;
        const to = tab.path ? `${basePath}/${tab.path}` : basePath;

        return (
          <NavLink
            className={({ isActive }) =>
              [
                'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-black transition',
                isActive
                  ? 'border-indigo-900 bg-indigo-950 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700',
              ].join(' ')
            }
            end={'end' in tab ? tab.end : undefined}
            key={tab.label}
            to={to}
          >
            <Icon />
            {tab.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function OperatorPanel({
  actions,
  children,
  description,
  title,
}: OperatorPanelProps) {
  return (
    <section className="grid gap-5 rounded border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          {description ? (
            <p className="text-sm font-medium text-slate-500">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
        ) : null}
      </header>
      {children}
    </section>
  );
}

export function OperatorMetricCard({
  description,
  icon,
  label,
  tone = 'indigo',
  value,
}: OperatorMetricCardProps) {
  return (
    <article className="grid min-h-32 gap-4 rounded border border-slate-200 bg-white p-6 shadow-sm">
      <span
        className={[
          'inline-flex size-10 items-center justify-center rounded border',
          toneClassNames[tone],
        ].join(' ')}
      >
        {icon}
      </span>
      <div className="grid gap-1">
        <p className="text-sm font-black text-slate-500">{label}</p>
        <strong className="text-3xl font-black tracking-normal text-slate-950">
          {value}
        </strong>
        {description ? (
          <p className="text-sm font-medium text-slate-500">{description}</p>
        ) : null}
      </div>
    </article>
  );
}

export function DashboardIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
      <path
        d="M3.5 4.5a1 1 0 0 1 1-1h4v5h-5v-4ZM11.5 3.5h4a1 1 0 0 1 1 1v2h-5v-3ZM3.5 11.5h5v5h-4a1 1 0 0 1-1-1v-4ZM11.5 9.5h5v6a1 1 0 0 1-1 1h-4v-7Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
      <path
        d="M7.75 3.5 7.2 5.25a5.8 5.8 0 0 0-1.05.62L4.35 5.5 2.85 8.1l1.25 1.38a5.91 5.91 0 0 0 0 1.04L2.85 11.9l1.5 2.6 1.8-.37c.32.24.68.45 1.05.62l.55 1.75h3l.55-1.75c.37-.17.73-.38 1.05-.62l1.8.37 1.5-2.6-1.25-1.38a5.91 5.91 0 0 0 0-1.04l1.25-1.38-1.5-2.6-1.8.37a5.8 5.8 0 0 0-1.05-.62l-.55-1.75h-3ZM9.25 7.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function NoticeIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
      <path
        d="M4 12.5V7.75A3.75 3.75 0 0 1 7.75 4h4.5A3.75 3.75 0 0 1 16 7.75v4.75l1.25 2H2.75l1.25-2ZM8.25 16.5h3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function TeamIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
      <path
        d="M7.5 9.25a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5ZM12.5 8.75a2.25 2.25 0 1 0 0-4.5M2.75 16.25a4.75 4.75 0 0 1 9.5 0M11.75 13.25a4 4 0 0 1 5.5 3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function ProblemIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
      <path
        d="M5 4.5h10M5 8h10M5 11.5h6M5 15h4M3.5 2.75h13a1 1 0 0 1 1 1v12.5a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V3.75a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function JudgeIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
      <path
        d="M6.5 14.5h7M8 17h4M10 2.5v3M5.5 6.5 4 5M14.5 6.5 16 5M5.5 10a4.5 4.5 0 1 1 9 0c0 1.8-.92 2.72-1.72 3.52-.48.48-.91.91-1.03 1.48h-3.5c-.12-.57-.55-1-1.03-1.48C6.42 12.72 5.5 11.8 5.5 10Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function ScoreboardIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
      <path
        d="M4.5 15.5v-6M10 15.5v-11M15.5 15.5v-8M3 16.5h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
