import { SvgIcon } from '@/utils/Icons';

type PageNoticeStatus = 'loading' | 'ready' | 'error' | 'idle';

type PageNoticeProps = {
  message?: string;
  status?: PageNoticeStatus;
};

function noticeTone(message: string, status?: PageNoticeStatus) {
  if (
    status === 'error' ||
    /실패|못했|오류|입력|필요|불가|차단|권한.*없|없습니다/.test(message)
  ) {
    return 'error';
  }

  if (status === 'loading' || /중입니다|진행|준비|불러오는/.test(message)) {
    return 'info';
  }

  return 'done';
}

export default function PageNotice({
  message,
  status = 'idle',
}: PageNoticeProps) {
  if (!message) return null;

  const tone = noticeTone(message, status);
  const iconName: 'alert' | 'check' | 'timer' =
    tone === 'error' ? 'alert' : tone === 'done' ? 'check' : 'timer';

  return (
    <section
      className={[
        'flex min-w-0 items-start gap-3 rounded-md border px-4 py-3 text-sm font-medium',
        tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : '',
        tone === 'info' ? 'border-sky-200 bg-sky-50 text-sky-800' : '',
        tone === 'done'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : '',
      ].join(' ')}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold">
        <SvgIcon name={iconName} size={14} />
      </span>
      <span className="min-w-0 break-keep">{message}</span>
    </section>
  );
}
