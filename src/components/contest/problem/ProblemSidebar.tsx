import { NavLink } from 'react-router-dom';
import type { Problem } from '@/domains/problemManagement/types';

type ProblemSidebarProps = {
  contestId: string;
  problems: Problem[];
  activeProblemId: string;
  targetView?: 'combined' | 'problem';
};

export default function ProblemSidebar({
  contestId,
  problems,
  activeProblemId,
  targetView = 'combined',
}: ProblemSidebarProps) {
  return (
    <aside className="border-r border-slate-200 bg-white">
      <nav aria-label="문제 목록" className="p-3">
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
                    ? `/contests/${contestId}/problems/${problem.problem_id}/statement`
                    : `/contests/${contestId}/problems/${problem.problem_id}`
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
