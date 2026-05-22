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
  targetView?: 'combined' | 'problem';
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
    <aside className="border-r border-slate-200 bg-white">
      <nav aria-label="문제 목록" className="grid gap-3 p-3">
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
        <ul className="grid gap-1">
          {problems.map((problem) => (
            <li key={problem.problem_id}>
              <NavLink
                className={({ isActive }) =>
                  [
                    'block truncate rounded px-4 py-3 text-sm font-bold transition',
                    isActive || problem.problem_id === activeProblemId
                      ? 'bg-slate-950 text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950',
                  ].join(' ')
                }
                to={
                  targetView === 'problem'
                    ? `/contests/${contestId}/problems/${problem.problem_id}/statement${suffix}`
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
