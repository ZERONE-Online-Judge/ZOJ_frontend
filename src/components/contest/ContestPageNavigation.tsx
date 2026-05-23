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
    <nav aria-label={sharedUiText.contestMenuAriaLabel} className="mt-8">
      <ul className="flex flex-wrap items-center gap-3">
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
                  className="inline-flex h-8 cursor-not-allowed items-center rounded-full border border-slate-200 bg-slate-50 px-5 text-sm font-bold text-slate-300"
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
                      'zoj-pressable inline-flex h-8 items-center rounded-full border px-5 text-sm font-bold transition',
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
