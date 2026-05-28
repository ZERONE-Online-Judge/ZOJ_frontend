import { NavLink } from 'react-router-dom';
import { contestCompactNavText, sharedUiText } from '@/data/uiText';
import { contestAccessPhase } from '@/domains/contestAdministration/logic';
import type { Contest } from '@/domains/contestAdministration/types';

type ContestPageNavigationProps = {
  contest?: Contest;
  contestId: string;
};

export default function ContestPageNavigation({
  contest,
  contestId,
}: ContestPageNavigationProps) {
  const isBeforeStart = contest
    ? contestAccessPhase(contest) === 'before'
    : false;

  return (
    <nav
      aria-label={sharedUiText.contestMenuAriaLabel}
      className="mt-6 -mx-3 overflow-x-auto px-3 pb-1 sm:mt-8 sm:mx-0 sm:px-0"
    >
      <ul className="flex min-w-max items-center gap-2 sm:gap-3">
        {contestCompactNavText.map((tab) => {
          const to = tab.path
            ? `/contests/${contestId}/${tab.path}`
            : `/contests/${contestId}`;
          const disabled =
            isBeforeStart && tab.path !== '' && tab.path !== 'board';

          return (
            <li key={tab.path || 'overview'}>
              {disabled ? (
                <button
                  className="inline-flex h-9 cursor-not-allowed items-center rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-bold whitespace-nowrap text-slate-300 sm:px-5"
                  disabled
                  title="대회 시작 전에는 문제집, 채점현황, 스코어보드를 볼 수 없습니다."
                  type="button"
                >
                  {tab.label}
                </button>
              ) : (
                <NavLink
                  className={({ isActive }) =>
                    [
                      'zoj-pressable inline-flex h-9 items-center rounded-full border px-4 text-sm font-bold whitespace-nowrap transition sm:px-5',
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
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
