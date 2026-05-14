import { NavLink } from 'react-router-dom';

const scoreboardTabs = [
  { label: '개요', path: '' },
  { label: '문제집', path: 'problems' },
  { label: '채점현황', path: 'submissions' },
  { label: '스코어보드', path: 'scoreboard' },
  { label: '게시판', path: 'board' },
] as const;

type ContestScoreboardTabsProps = {
  contestId: string;
};

export default function ContestScoreboardTabs({
  contestId,
}: ContestScoreboardTabsProps) {
  return (
    <nav aria-label="대회 메뉴" className="mt-8">
      <ul className="flex flex-wrap items-center gap-3">
        {scoreboardTabs.map((tab) => {
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
