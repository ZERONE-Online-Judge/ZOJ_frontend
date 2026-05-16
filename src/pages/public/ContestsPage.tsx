import { useQuery } from '@tanstack/react-query';
import PageLayout from '@/components/common/PageLayout';
import ContestListItem from '@/components/ui/ContestListItem';
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
      description="참가 가능한 대회와 예정된 대회를 확인하세요."
      eyebrow="Contest"
      title="대회 목록"
    >
      {contestsQuery.isLoading && (
        <PageNotice message="공개 대회를 불러오는 중입니다." status="loading" />
      )}
      {contestsQuery.isError && (
        <PageNotice message="공개 대회를 불러오지 못했습니다." status="error" />
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
        <PageNotice message="표시할 공개 대회가 없습니다." status="idle" />
      )}
    </PageLayout>
  );
}
