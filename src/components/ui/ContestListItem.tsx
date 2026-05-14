import { Link } from 'react-router-dom';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';

export type ContestListItemData = {
  contestId: string;
  title: string;
  organization: string;
  status: string;
  period?: string;
  registrationDeadline?: string;
  isOpen?: boolean;
  href?: string;
};

type ContestListItemProps = ContestListItemData;

export default function ContestListItem({
  contestId,
  title,
  organization,
  status,
  period,
  registrationDeadline,
  isOpen = false,
  href,
}: ContestListItemProps) {
  const generalSession = useSessionStore((state) => state.generalSession);
  const loginHref = `/login?reason=contest&contestId=${encodeURIComponent(contestId)}`;
  const contestHref = `/contests/${encodeURIComponent(contestId)}`;
  const itemHref = href ?? (generalSession ? contestHref : loginHref);

  const content = (
    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
            <span className={isOpen ? 'size-2 rounded-full bg-emerald-500' : 'bg-zoj-blue size-2 rounded-full'} />
            {status}
          </span>
          <span className="text-sm font-semibold text-slate-500">{organization}</span>
        </div>
        <h2 className="text-xl font-black leading-8 text-slate-950">{title}</h2>
      </div>

      <div className="flex flex-wrap gap-2 md:justify-end">
        {period ? (
          <span className="bg-zoj-blue/10 text-zoj-blue px-3 py-1.5 text-sm font-semibold">
            기간: {period}
          </span>
        ) : null}
        {registrationDeadline ? (
          <span className="bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600">
            모집 마감: {registrationDeadline}
          </span>
        ) : null}
      </div>
    </div>
  );

  return (
    <li className="rounded-md border border-slate-200 bg-white px-6 py-5 transition hover:border-zoj-blue hover:shadow-sm">
      {itemHref ? (
        <Link className="block" to={itemHref}>
          {content}
        </Link>
      ) : (
        content
      )}
    </li>
  );
}
