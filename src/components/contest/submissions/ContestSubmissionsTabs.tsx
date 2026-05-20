import ContestPageNavigation from '@/components/contest/ContestPageNavigation';
import type { Contest } from '@/domains/contestAdministration/types';

type ContestSubmissionsTabsProps = {
  contest?: Contest;
  contestId: string;
};

export default function ContestSubmissionsTabs({
  contest,
  contestId,
}: ContestSubmissionsTabsProps) {
  return <ContestPageNavigation contest={contest} contestId={contestId} />;
}
