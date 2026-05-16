import { Link } from 'react-router-dom';
import { contestListItemText } from '@/data/uiText';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';

export type ContestCardData = {
  contestId?: string;
  title: string;
  organization: string;
  status: string;
  period?: string;
  registrationDeadline?: string;
  isOpen?: boolean;
  href?: string;
};

type ContestCardProps = ContestCardData & {
  className?: string;
};

export default function ContestCard({
  contestId,
  title,
  organization,
  status,
  period,
  registrationDeadline,
  isOpen = false,
  href,
  className,
}: ContestCardProps) {
  const generalSession = useSessionStore((state) => state.generalSession);
  const loginHref = contestId
    ? `/login?reason=contest&contestId=${encodeURIComponent(contestId)}`
    : undefined;
  const contestHref = contestId
    ? `/contests/${encodeURIComponent(contestId)}`
    : undefined;
  const cardHref = href ?? (generalSession ? contestHref : loginHref);
  const cardClassName = [
    'rounded border border-slate-200 bg-white px-8 py-7 transition hover:border-zoj-blue hover:shadow-sm',
    cardHref ? 'cursor-pointer' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const cardContent = (
    <>
      <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5">
        <span
          className={
            isOpen
              ? 'size-2 rounded-full bg-emerald-500'
              : 'bg-zoj-blue size-2 rounded-full'
          }
        />
        <span className="text-sm font-semibold text-slate-700">{status}</span>
      </div>

      <h3 className="min-h-16 text-xl leading-8 font-semibold break-keep text-slate-950">
        {title}
      </h3>
      <p className="mt-4 text-base font-medium break-keep text-slate-400">
        {organization}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {period ? (
          <span className="bg-zoj-blue/10 text-zoj-blue px-3 py-1.5 text-sm font-semibold">
            {contestListItemText.periodPrefix}: {period}
          </span>
        ) : null}
        {registrationDeadline ? (
          <span className="bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600">
            {contestListItemText.registrationDeadlinePrefix}:{' '}
            {registrationDeadline}
          </span>
        ) : null}
      </div>
    </>
  );

  return (
    <li className={cardClassName}>
      {cardHref ? (
        <Link className="block h-full" to={cardHref}>
          {cardContent}
        </Link>
      ) : (
        cardContent
      )}
    </li>
  );
}
