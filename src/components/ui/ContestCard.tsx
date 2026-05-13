import { Link } from 'react-router-dom';

export type ContestCardData = {
  title: string;
  organization: string;
  status: string;
  date: string;
  schedule?: string;
  isOpen?: boolean;
  href?: string;
};

type ContestCardProps = ContestCardData & {
  className?: string;
};

export default function ContestCard({
  title,
  organization,
  status,
  schedule,
  date,
  isOpen = false,
  href,
  className,
}: ContestCardProps) {
  const cardClassName = [
    'rounded border border-slate-200 bg-white px-6 py-5 transition hover:border-zoj-blue hover:shadow-sm',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const cardContent = (
    <>
      <div className="mb-4 inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
        <span
          className={
            isOpen
              ? 'size-2 rounded-full bg-emerald-500'
              : 'bg-zoj-blue size-2 rounded-full'
          }
        />
        <span className="text-xs font-semibold text-slate-700">{status}</span>
      </div>

      <h3 className="min-h-14 text-lg leading-7 font-semibold text-slate-950">
        {title}
      </h3>
      <p className="mt-3 text-sm font-medium text-slate-400">{organization}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {schedule ? (
          <span className="bg-zoj-blue/10 text-zoj-blue px-2 py-1 text-xs font-semibold">
            {schedule}
          </span>
        ) : null}
        <span className="bg-zoj-blue/10 text-zoj-blue px-2 py-1 text-xs font-semibold">
          {date}
        </span>
      </div>
    </>
  );

  return (
    <li className={cardClassName}>
      {href ? (
        <Link className="block h-full" to={href}>
          {cardContent}
        </Link>
      ) : (
        cardContent
      )}
    </li>
  );
}
