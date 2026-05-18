import type { Contest } from '@/domains/contestAdministration/types';
import { contestStatusLabel, contestAccessPhase } from '@/domains/contestAdministration/logic';
import { formatContestMoment } from '@/shared/lib/dateTime';

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

export function toContestCardData(contest: Contest) {
  return {
    contestId: contest.contest_id,
    title: contest.title,
    organization: contest.organization_name,
    status: contestStatusLabel(contest.status),
    period: contestPeriodLabel(contest),
    isOpen: contestIsOpen(contest),
  };
}
