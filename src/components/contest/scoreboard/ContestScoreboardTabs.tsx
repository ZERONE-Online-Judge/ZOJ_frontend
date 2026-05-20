import ContestPageNavigation from '@/components/contest/ContestPageNavigation';
import type { Contest } from '@/domains/contestAdministration/types';

type ContestScoreboardTabsProps = {
  contest?: Contest;
  contestId: string;
};

export default function ContestScoreboardTabs({
  contest,
  contestId,
}: ContestScoreboardTabsProps) {
  return <ContestPageNavigation contest={contest} contestId={contestId} />;
}
