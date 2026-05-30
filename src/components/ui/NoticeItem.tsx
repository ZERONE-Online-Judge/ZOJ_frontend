import { Link } from 'react-router-dom';
import { sharedUiText } from '@/data/uiText';
import { SvgIcon } from '@/utils/Icons';

export type NoticeItemData = {
  title: string;
  date: string;
  label?: string;
  href?: string;
  tone?: 'default' | 'emergency' | 'pinned';
};

type NoticeItemProps = NoticeItemData & {
  compact?: boolean;
};

export default function NoticeItem({
  title,
  date,
  label = sharedUiText.noticeLabel,
  href,
  tone = 'default',
  compact = false,
}: NoticeItemProps) {
  const content = (
    <div
      className={[
        'flex flex-col transition hover:bg-amber-50 sm:flex-row sm:items-center sm:justify-between',
        compact
          ? 'min-h-9 gap-1.5 px-2.5 py-1.5 sm:gap-3 sm:px-3'
          : 'min-h-14 gap-3 px-3 py-3 sm:min-h-16 sm:gap-10 sm:px-6 sm:py-4',
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
            'inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold text-white',
            tone === 'emergency' || tone === 'pinned'
              ? 'bg-red-600'
              : 'bg-slate-950',
            compact ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs sm:px-4 sm:py-1.5 sm:text-sm',
          ].join(' ')}
        >
          <SvgIcon name="megaphone" size={compact ? 11 : 14} />
          {label}
        </span>
        <span
          className={[
            'min-w-0 font-semibold break-keep text-slate-950 sm:truncate',
            compact ? 'text-xs' : 'text-base sm:text-lg',
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
