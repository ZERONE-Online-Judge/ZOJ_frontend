import { NavLink } from 'react-router-dom';

export default function OperatorSettingsNavigation({
  contestId,
  canManageSettings = true,
}: {
  contestId: string;
  canManageSettings?: boolean;
}) {
  return (
    <nav
      aria-label="설정과 운영 가이드"
      className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1.5 text-sm"
    >
      {[
        ...(canManageSettings
          ? [{ path: 'settings', label: '대회 설정' }]
          : []),
        { path: 'guide', label: '운영 가이드' },
      ].map((item) => (
        <NavLink
          key={item.path}
          to={`/operator/contests/${contestId}/${item.path}`}
          className={({ isActive }) =>
            `rounded-lg px-4 py-2.5 font-semibold transition ${isActive ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-800'}`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
