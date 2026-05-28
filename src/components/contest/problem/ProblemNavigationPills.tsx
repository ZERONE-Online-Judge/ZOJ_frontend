import { Link } from 'react-router-dom';
import { problemDetailNavText, sharedUiText } from '@/data/uiText';

type ProblemNavigationPillsProps = {
  contestId: string;
  problemId: string;
  active: 'combined' | 'problem' | 'submit' | 'editorial';
  allowEditorial?: boolean;
  allowSubmit?: boolean;
  search?: string;
};

export default function ProblemNavigationPills({
  contestId,
  problemId,
  active,
  allowEditorial = false,
  allowSubmit = true,
  search = '',
}: ProblemNavigationPillsProps) {
  const suffix = search && search !== '?' ? search : '';

  return (
    <nav
      aria-label={sharedUiText.problemDetailMenuAriaLabel}
      className="-mx-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0"
    >
      <ul className="flex min-w-max items-center gap-2 sm:gap-3">
        {problemDetailNavText
          .filter((tab) => {
            if (!allowSubmit && (tab.key === 'submit' || tab.key === 'combined')) return false;
            if (!allowEditorial && tab.key === 'editorial') return false;
            return true;
          })
          .map((tab) => {
            const to = tab.path
              ? `/contests/${contestId}/problems/${problemId}/${tab.path}${suffix}`
              : `/contests/${contestId}/problems/${problemId}${suffix}`;
            const isActive = tab.key === active;

            return (
              <li key={tab.key}>
                <Link
                  className={[
                    'inline-flex h-9 items-center rounded-full border px-4 text-sm font-bold whitespace-nowrap transition sm:px-5',
                    isActive
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-slate-200 bg-white text-slate-950 hover:border-slate-400',
                  ].join(' ')}
                  to={to}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
      </ul>
    </nav>
  );
}
