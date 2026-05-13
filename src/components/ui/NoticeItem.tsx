import { Link } from 'react-router-dom';

export type NoticeItemData = {
  title: string;
  date: string;
  label?: string;
  href?: string;
};

type NoticeItemProps = NoticeItemData;

export default function NoticeItem({
  title,
  date,
  label = '공지',
  href,
}: NoticeItemProps) {
  const content = (
    <div className="flex h-11 items-center justify-between gap-8 px-4 transition hover:bg-amber-50">
      <div className="flex min-w-0 items-center gap-6">
        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
          {label}
        </span>
        <span className="truncate text-sm font-semibold text-slate-950">
          {title}
        </span>
      </div>
      <time className="shrink-0 text-xs font-medium text-slate-500">
        {date}
      </time>
    </div>
  );

  return (
    <li>
      {href ? (
        <Link className="block" to={href}>
          {content}
        </Link>
      ) : (
        content
      )}
    </li>
  );
}
