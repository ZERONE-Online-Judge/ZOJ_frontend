import { Link } from 'react-router-dom';
import { sharedUiText } from '@/data/uiText';
import { SvgIcon } from '@/utils/Icons';

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
          ? 'min-h-9 gap-1.5 px-2.5 py-1.5 sm:gap-3 sm:px-3'
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
            'inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-950 font-semibold text-white',
            compact ? 'px-2 py-0.5 text-[11px]' : 'px-4 py-1.5 text-sm',
          ].join(' ')}
        >
          <SvgIcon name="megaphone" size={compact ? 11 : 14} />
          {label}
        </span>
        <span
          className={[
            'min-w-0 font-semibold break-keep text-slate-950 sm:truncate',
            compact ? 'text-xs' : 'text-lg',
          ].join(' ')}
        >
          {title}
        </span>
      </div>
      <time
        className={[
          'shrink-0 font-medium text-slate-500 sm:text-right',
          compact ? 'text-[11px]' : 'text-sm',
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
