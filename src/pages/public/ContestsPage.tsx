import { useQuery } from '@tanstack/react-query';
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
    <section className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-14 font-sans lg:px-8">
      <header className="grid gap-2">
        <span className="text-sm font-bold text-zoj-blue">Contest</span>
        <h1 className="text-3xl font-black tracking-normal text-slate-950">공개 대회</h1>
        <p className="text-base leading-7 text-slate-600">
          참가 가능한 대회와 예정된 대회를 확인하세요.
        </p>
      </header>

      {contestsQuery.isLoading && <PageNotice message="공개 대회를 불러오는 중입니다." status="loading" />}
      {contestsQuery.isError && <PageNotice message="공개 대회를 불러오지 못했습니다." status="error" />}

      <ul className="grid grid-cols-1 gap-4">
        {contests.map((contest) => (
          <ContestListItem key={contest.contest_id} {...toContestCardData(contest)} />
        ))}
      </ul>

      {!contestsQuery.isLoading && contests.length === 0 && (
        <PageNotice message="표시할 공개 대회가 없습니다." status="idle" />
      )}
    </section>
  );
}
