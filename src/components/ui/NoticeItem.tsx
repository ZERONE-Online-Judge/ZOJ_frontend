import { Link } from 'react-router-dom';
import { sharedUiText } from '@/data/uiText';

export type NoticeItemData = {
  title: string;
  date: string;
  label?: string;
  href?: string;
};

type NoticeItemProps = NoticeItemData & {
  compact?: boolean;
};

export default function NoticeItem({
  title,
  date,
  label = sharedUiText.noticeLabel,
  href,
  compact = false,
}: NoticeItemProps) {
  const content = (
    <div
      className={[
        'flex flex-col transition hover:bg-amber-50 sm:flex-row sm:items-center sm:justify-between',
        compact
          ? 'min-h-11 gap-2 px-3 py-2 sm:gap-4 sm:px-4'
          : 'min-h-16 gap-3 px-4 py-4 sm:gap-10 sm:px-6',
      ].join(' ')}
    >
      <div
        className={[
          'flex min-w-0 flex-wrap items-center',
          compact ? 'gap-2 sm:gap-3' : 'gap-3 sm:gap-7',
        ].join(' ')}
      >
        <span
          className={[
            'shrink-0 rounded-full bg-slate-950 font-semibold text-white',
            compact ? 'px-2.5 py-1 text-xs' : 'px-4 py-1.5 text-sm',
          ].join(' ')}
        >
          {label}
        </span>
        <span
          className={[
            'min-w-0 font-semibold break-keep text-slate-950 sm:truncate',
            compact ? 'text-sm' : 'text-lg',
          ].join(' ')}
        >
          {title}
        </span>
      </div>
      <time
        className={[
          'shrink-0 font-medium text-slate-500 sm:text-right',
          compact ? 'text-xs' : 'text-sm',
        ].join(' ')}
      >
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
