export type NoticeItemData = {
  title: string;
  date: string;
  label?: string;
};

type NoticeItemProps = NoticeItemData;

export default function NoticeItem({
  title,
  date,
  label = '공지',
}: NoticeItemProps) {
  return (
    <li className="flex h-11 items-center justify-between gap-8 px-4">
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
    </li>
  );
}
