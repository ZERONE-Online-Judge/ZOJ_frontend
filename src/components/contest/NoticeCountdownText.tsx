import type { Contest } from '@/domains/contestAdministration/types';
import { useNoticeCountdown } from '@/domains/serviceCommunication/useNoticeCountdown';

export default function NoticeCountdownText({
  text,
  template,
  contest,
}: {
  text: string;
  template?: string | null;
  contest?: Contest;
}) {
  const rendered = useNoticeCountdown(text, template, contest);
  return <span aria-live="off">{rendered.text}</span>;
}

export function NoticeCountdownCommands({
  onInsert,
}: {
  onInsert: (command: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2" aria-label="카운트다운 문구 추가">
        {(['start', 'freeze', 'end'] as const).map((target) => (
          <button
            className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700"
            key={target}
            type="button"
            onClick={() => onInsert(`{{countdown:${target}}}`)}
          >
            {{ start: '시작', freeze: '프리즈', end: '종료' }[target]}{' '}
            카운트다운
          </button>
        ))}
      </div>
      <p className="text-xs leading-5 text-slate-500">
        명령어가 남은 시간 안내로 바뀝니다. 시간은 자동으로 줄어들며, 0이 되면
        완료 안내로 바뀝니다.
      </p>
    </div>
  );
}
