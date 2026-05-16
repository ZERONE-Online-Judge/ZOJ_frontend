import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import PageLayout from '@/components/common/PageLayout';
import type { StaffSession } from '@/domains/identityAccess/types';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';

type AdminAccessGateProps = {
  children: (session: StaffSession) => ReactNode;
};

type AdminMetricCardProps = {
  accent?: 'violet' | 'amber' | 'emerald' | 'rose' | 'slate';
  description?: ReactNode;
  icon: ReactNode;
  label: string;
  value: ReactNode;
};

type AdminPanelProps = {
  actions?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  title: string;
};

const adminTabs = [
  { label: '관리 홈', path: '/admin', icon: DashboardIcon, end: true },
  { label: '대회 관리', path: '/admin/contests', icon: ContestIcon },
  { label: '채점 관리', path: '/admin/judge', icon: JudgeIcon },
] as const;

const accentClassNames = {
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
} as const;

export function AdminIconBadge({
  children,
  tone = 'violet',
}: {
  children: ReactNode;
  tone?: keyof typeof accentClassNames;
}) {
  return (
    <span
      className={[
        'inline-flex size-11 shrink-0 items-center justify-center rounded border',
        accentClassNames[tone],
      ].join(' ')}
    >
      {children}
    </span>
  );
}

export function AdminAccessGate({ children }: AdminAccessGateProps) {
  const staffSession = useSessionStore(
    (state) => state.generalSession?.operatorSession,
  );

  if (!staffSession) {
    return (
      <PageLayout
        description="관리자 기능은 운영자 세션이 있는 계정으로만 접근할 수 있습니다."
        title="관리자 로그인 필요"
      >
        <Link
          className="w-fit rounded border border-violet-200 bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-violet-700"
          to="/login"
        >
          로그인 페이지로 이동
        </Link>
      </PageLayout>
    );
  }

  if (!staffSession.staff.is_service_master) {
    return (
      <PageLayout
        description="현재 계정에는 서비스 관리자 권한이 없습니다. 권한이 필요하면 서비스 마스터에게 요청하세요."
        title="접근 권한 없음"
      >
        <div className="rounded border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-800">
          관리자 전용 기능은 서비스 마스터 계정에서만 사용할 수 있습니다.
        </div>
      </PageLayout>
    );
  }

  return children(staffSession);
}

export function AdminTabs() {
  return (
    <nav aria-label="관리자 메뉴" className="flex flex-wrap gap-2">
      {adminTabs.map((tab) => {
        const Icon = tab.icon;

        return (
          <NavLink
            className={({ isActive }) =>
              [
                'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-black transition',
                isActive
                  ? 'border-violet-900 bg-violet-950 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700',
              ].join(' ')
            }
            end={'end' in tab ? tab.end : undefined}
            key={tab.path}
            to={tab.path}
          >
            <Icon />
            {tab.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function AdminMetricCard({
  accent = 'violet',
  description,
  icon,
  label,
  value,
}: AdminMetricCardProps) {
  return (
    <article className="grid min-h-36 gap-5 rounded border border-slate-200 bg-white p-6 shadow-sm">
      <AdminIconBadge tone={accent}>{icon}</AdminIconBadge>
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

export function AdminPanel({
  actions,
  children,
  description,
  title,
}: AdminPanelProps) {
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

export function ContestIcon() {
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
