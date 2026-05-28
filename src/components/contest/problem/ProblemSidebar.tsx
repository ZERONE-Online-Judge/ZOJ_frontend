import { NavLink } from 'react-router-dom';
import type { Division } from '@/domains/contestAdministration/types';
import type { Problem } from '@/domains/problemManagement/types';

type ProblemSidebarProps = {
  contestId: string;
  problems: Problem[];
  activeProblemId: string;
  divisions?: Division[];
  selectedDivisionId?: string;
  onDivisionChange?: (divisionId: string) => void;
  targetView?: 'combined' | 'problem' | 'editorial';
  search?: string;
};

export default function ProblemSidebar({
  contestId,
  problems,
  activeProblemId,
  divisions = [],
  selectedDivisionId = '',
  onDivisionChange,
  targetView = 'combined',
  search = '',
}: ProblemSidebarProps) {
  const suffix = search && search !== '?' ? search : '';
  const showDivisionSelect = divisions.length > 1 && onDivisionChange;

  return (
    <aside className="min-w-0 border-b border-slate-200 bg-slate-50 xl:border-r xl:border-b-0 xl:bg-white">
      <nav aria-label="문제 목록" className="grid gap-3 p-3">
        <div className="flex items-center justify-between gap-3 px-1 xl:block">
          <span className="text-xs font-black tracking-wide text-slate-500 uppercase">
            빠른 문제 전환
          </span>
          <span className="text-xs font-bold text-slate-400 xl:hidden">
            좌우로 이동
          </span>
        </div>
        {showDivisionSelect ? (
          <label className="grid gap-2 px-1 text-xs font-black text-slate-500">
            유형
            <span className="relative block">
              <select
                className="h-10 w-full appearance-none rounded border border-slate-200 bg-white px-3 pr-9 text-sm font-bold text-slate-800 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                onChange={(event) => onDivisionChange(event.target.value)}
                value={selectedDivisionId}
              >
                {divisions.map((division) => (
                  <option
                    key={division.division_id}
                    value={division.division_id}
                  >
                    {division.name}
                  </option>
                ))}
              </select>
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-500"
                fill="none"
                viewBox="0 0 20 20"
              >
                <path
                  d="m5 7.5 5 5 5-5"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </span>
          </label>
        ) : null}
        <ul className="-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-1 xl:mx-0 xl:grid xl:gap-1 xl:overflow-visible xl:px-0 xl:pb-0">
          {problems.map((problem) => (
            <li className="shrink-0 xl:shrink" key={problem.problem_id}>
              <NavLink
                className={({ isActive }) =>
                  [
                    'flex h-10 max-w-[16rem] items-center rounded border px-3 text-sm font-bold whitespace-nowrap transition xl:block xl:h-auto xl:max-w-none xl:truncate xl:border-0 xl:px-4 xl:py-3 xl:whitespace-normal',
                    isActive || problem.problem_id === activeProblemId
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 xl:bg-transparent',
                  ].join(' ')
                }
                to={
                  targetView === 'problem'
                    ? `/contests/${contestId}/problems/${problem.problem_id}/statement${suffix}`
                    : targetView === 'editorial'
                      ? `/contests/${contestId}/problems/${problem.problem_id}/editorial${suffix}`
                      : `/contests/${contestId}/problems/${problem.problem_id}${suffix}`
                }
              >
                {problem.problem_code} {problem.title}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
