import { useQuery } from '@tanstack/react-query';
import PageLayout from '@/components/common/PageLayout';
import ContestListItem from '@/components/ui/ContestListItem';
import { publicPageText } from '@/data/uiText';
import { getPublicContests } from '@/domains/contestAdministration/api';
import { sortContestsByStartAt } from '@/domains/contestAdministration/logic';
import { toContestCardData } from '@/domains/contestAdministration/presentation';
import PageNotice from '@/shared/ui/PageNotice';

export default function ContestsPage() {
  const contestsQuery = useQuery({
    queryKey: ['public-contests'],
    queryFn: getPublicContests,
    refetchInterval: 15_000,
  });

  const contests = sortContestsByStartAt(contestsQuery.data ?? []);

  return (
    <PageLayout
      description={publicPageText.contests.description}
      eyebrow={publicPageText.contests.eyebrow}
      title={publicPageText.contests.title}
    >
      {contestsQuery.isLoading && (
        <PageNotice
          message={publicPageText.contests.loading}
          status="loading"
        />
      )}
      {contestsQuery.isError && (
        <PageNotice
          message={publicPageText.contests.loadError}
          status="error"
        />
      )}

      <ul className="grid grid-cols-1 gap-4">
        {contests.map((contest) => (
          <ContestListItem
            key={contest.contest_id}
            {...toContestCardData(contest)}
          />
        ))}
      </ul>

      {!contestsQuery.isLoading && contests.length === 0 && (
        <PageNotice message={publicPageText.contests.empty} status="idle" />
      )}
    </PageLayout>
  );
}
