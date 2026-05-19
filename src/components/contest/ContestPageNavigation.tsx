import { NavLink } from 'react-router-dom';
import { contestCompactNavText, sharedUiText } from '@/data/uiText';

type ContestPageNavigationProps = {
  contestId: string;
};

export default function ContestPageNavigation({
  contestId,
}: ContestPageNavigationProps) {
  return (
    <nav aria-label={sharedUiText.contestMenuAriaLabel} className="mt-8">
      <ul className="flex flex-wrap items-center gap-3">
        {contestCompactNavText.map((tab) => {
          const to = tab.path
            ? `/contests/${contestId}/${tab.path}`
            : `/contests/${contestId}`;

          return (
            <li key={tab.path || 'overview'}>
              <NavLink
                className={({ isActive }) =>
                  [
                    'inline-flex h-8 items-center rounded-full border px-5 text-sm font-bold transition',
                    isActive
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-slate-200 bg-white text-slate-950 hover:border-slate-400',
                  ].join(' ')
                }
                end={!tab.path}
                to={to}
              >
                {tab.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
