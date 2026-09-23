import type { Contest } from '@/domains/contestAdministration/types';

type Target = 'start' | 'freeze' | 'end';
const labels = {
  start: '대회 시작',
  freeze: '스코어보드 프리즈',
  end: '대회 종료',
};
const completed = {
  start: '대회가 시작되었습니다.',
  freeze:
    '스코어보드가 프리즈되었습니다. 이후 제출 결과는 스코어보드에서 잠시 숨겨집니다.',
  end: '대회가 종료되었습니다. 수고하셨습니다.',
};
const commandPattern = /\{\{countdown:(start|freeze|end)(?:@([^\s{}]+))?\}\}/g;

export function renderNoticeCountdown(
  template: string,
  contest: Contest | undefined,
  now: number,
) {
  const identities: string[] = [];
  let pending = false;
  const text = template.replace(
    commandPattern,
    (command: string, target: Target, fixed?: string) => {
      const value = fixed ?? contest?.[`${target}_at`];
      const deadline =
        value && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
      let phase = 'countdown';
      let message: string;
      if (contest && ['draft', 'schedule_tbd'].includes(contest.status)) {
        phase = 'unscheduled';
        message = `${labels[target]} 일정이 확정되지 않았습니다.`;
      } else if (
        target === 'freeze' &&
        contest?.scoreboard_freeze_mode === 'live'
      ) {
        phase = 'live';
        message = '스코어보드가 실시간으로 갱신됩니다.';
      } else if (
        (target === 'freeze' && contest?.scoreboard_freeze_mode === 'frozen') ||
        (target === 'end' &&
          contest &&
          ['ended', 'finalized', 'archived'].includes(contest.status))
      ) {
        phase = 'completed';
        message = completed[target];
      } else if (!Number.isFinite(deadline)) {
        phase = 'invalid';
        message = fixed ? command : `${labels[target]} 일정을 확인해 주세요.`;
      } else {
        const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));
        if (seconds === 0) {
          phase = 'completed';
          message = completed[target];
        } else {
          pending = true;
          const parts = [
            [Math.floor(seconds / 86400), '일'],
            [Math.floor(seconds / 3600) % 24, '시간'],
            [Math.floor(seconds / 60) % 60, '분'],
            [seconds % 60, '초'],
          ] as const;
          message = `${labels[target]}까지 ${parts
            .filter(([amount]) => amount > 0)
            .map(([amount, unit]) => `${amount}${unit}`)
            .join(' ')} 남았습니다.`;
        }
      }
      identities.push(`${target}:${value ?? ''}:${phase}`);
      return message;
    },
  );
  return {
    text,
    pending,
    identity: identities.length
      ? `${template}|${identities.join('|')}`
      : template,
  };
}
