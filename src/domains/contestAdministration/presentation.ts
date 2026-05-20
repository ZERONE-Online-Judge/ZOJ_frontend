import type { Contest } from '@/domains/contestAdministration/types';
import { contestStatusLabel, contestAccessPhase } from '@/domains/contestAdministration/logic';
import { formatContestMoment, timeLeft } from '@/shared/lib/dateTime';

export function contestPeriodLabel(contest: Contest) {
  const phase = contestAccessPhase(contest);
  if (phase === 'schedule_tbd') return undefined;

  const start = formatContestMoment(contest.start_at);
  const end = formatContestMoment(contest.end_at);

  return `${start} - ${end}`;
}

export function contestIsOpen(contest: Contest) {
  const phase = contestAccessPhase(contest);
  return phase === 'before' || phase === 'running' || contest.status === 'open';
}

export function contestCountdownLabel(contest: Contest) {
  const phase = contestAccessPhase(contest);

  if (phase === 'running') {
    return `남은 시간 ${timeLeft(contest.end_at)}`;
  }

  if (phase === 'before') {
    const diff = new Date(contest.start_at).getTime() - Date.now();
    const days = Math.ceil(diff / 86_400_000);
    if (days > 0) return `D-${days}`;
    return `D-Day · 시작까지 ${timeLeft(contest.start_at)}`;
  }

  if (phase === 'schedule_tbd') return '초안';

  return undefined;
}

export function toContestCardData(contest: Contest) {
  return {
    contestId: contest.contest_id,
    title: contest.title,
    organization: contest.organization_name,
    status: contestStatusLabel(contest.status),
    countdownLabel: contestCountdownLabel(contest),
    period: contestPeriodLabel(contest),
    isOpen: contestIsOpen(contest),
  };
}
