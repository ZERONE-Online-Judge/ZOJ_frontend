import { useContestParticipantSession } from '@/domains/contestRuntime/useContestParticipantSession';
import { NavLink } from 'react-router-dom';
import { contestCompactNavText, sharedUiText } from '@/data/uiText';
import {
  canViewContestResource,
  contestAccessPhase,
  contestResourceAccess,
} from '@/domains/contestAdministration/logic';
import type { Contest } from '@/domains/contestAdministration/types';

type ContestPageNavigationProps = {
  contest?: Contest;
  contestId: string;
};

export default function ContestPageNavigation({
  contest,
  contestId,
}: ContestPageNavigationProps) {
  const { isPreview, participantContest, activeParticipantSession } =
    useContestParticipantSession(contestId);
  const hasSessionAccess = Boolean(
    participantContest || activeParticipantSession,
  );
  const phase = contest ? contestAccessPhase(contest) : undefined;
  const tabs = contestCompactNavText.filter((tab) => {
    if (!tab.path || isPreview || !contest) return true;
    if (phase === 'before' || phase === 'schedule_tbd') return hasSessionAccess;
    const canView = (resource: Parameters<typeof contestResourceAccess>[1]) =>
      canViewContestResource(
        contest,
        hasSessionAccess,
        contestResourceAccess(contest, resource),
      );
    if (tab.path === 'board') return canView('notice') || canView('board');
    const resources = {
      problems: 'problem',
      submissions: 'submission',
      scoreboard: 'scoreboard',
    } as const;
    return canView(resources[tab.path]);
  });
  const isBeforeStart =
    !isPreview && contest ? contestAccessPhase(contest) === 'before' : false;

  return (
    <nav
      aria-label={sharedUiText.contestMenuAriaLabel}
      className="zoj-contest-tabs mt-5 min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5"
    >
      <ul className="flex min-w-max items-center gap-1">
        {tabs.map((tab) => {
          const to = tab.path
            ? `/contests/${contestId}/${tab.path}`
            : `/contests/${contestId}`;
          const disabled =
            isBeforeStart && tab.path !== '' && tab.path !== 'board';

          return (
            <li key={tab.path || 'overview'}>
              {disabled ? (
                <button
                  className="inline-flex h-10 cursor-not-allowed items-center rounded-lg border border-transparent px-4 text-sm font-medium whitespace-nowrap text-slate-400"
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
                      'inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium whitespace-nowrap transition',
                      isActive
                        ? 'border-indigo-100 bg-indigo-50 text-indigo-700'
                        : 'border-transparent bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900',
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
