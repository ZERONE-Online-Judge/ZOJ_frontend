import { Link } from 'react-router-dom';
import { sharedUiText } from '@/data/uiText';

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
  label = sharedUiText.noticeLabel,
  href,
}: NoticeItemProps) {
  const content = (
    <div className="flex min-h-16 flex-col gap-3 px-4 py-4 transition hover:bg-amber-50 sm:flex-row sm:items-center sm:justify-between sm:gap-10 sm:px-6">
      <div className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-7">
        <span className="shrink-0 rounded-full bg-slate-950 px-4 py-1.5 text-sm font-semibold text-white">
          {label}
        </span>
        <span className="min-w-0 text-lg font-semibold break-keep text-slate-950 sm:truncate">
          {title}
        </span>
      </div>
      <time className="shrink-0 text-sm font-medium text-slate-500 sm:text-right">
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
