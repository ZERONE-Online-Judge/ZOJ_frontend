import { Link } from 'react-router-dom';
import { problemDetailNavText, sharedUiText } from '@/data/uiText';

type ProblemNavigationPillsProps = {
  contestId: string;
  problemId: string;
  active: 'combined' | 'problem' | 'submit';
  allowSubmit?: boolean;
  search?: string;
};

export default function ProblemNavigationPills({
  contestId,
  problemId,
  active,
  allowSubmit = true,
  search = '',
}: ProblemNavigationPillsProps) {
  const suffix = search && search !== '?' ? search : '';

  return (
    <nav aria-label={sharedUiText.problemDetailMenuAriaLabel}>
      <ul className="flex flex-wrap items-center gap-3">
        {problemDetailNavText
          .filter((tab) => allowSubmit || tab.key === 'problem')
          .map((tab) => {
            const to = tab.path
              ? `/contests/${contestId}/problems/${problemId}/${tab.path}${suffix}`
              : `/contests/${contestId}/problems/${problemId}${suffix}`;
            const isActive = tab.key === active;

            return (
              <li key={tab.key}>
                <Link
                  className={[
                    'inline-flex h-8 items-center rounded-full border px-5 text-sm font-bold transition',
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
