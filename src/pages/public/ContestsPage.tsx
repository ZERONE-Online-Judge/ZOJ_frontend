import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import PageLayout from '@/components/common/PageLayout';
import ContestListItem from '@/components/ui/ContestListItem';
import { publicPageText } from '@/data/uiText';
import { getPublicContests } from '@/domains/contestAdministration/api';
import { sortContestsByStartAt } from '@/domains/contestAdministration/logic';
import { toContestCardData } from '@/domains/contestAdministration/presentation';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';
import PageNotice from '@/shared/ui/PageNotice';

type ContestFilter = 'all' | 'mine';

export default function ContestsPage() {
  const [filter, setFilter] = useState<ContestFilter>('all');
  const generalSession = useSessionStore((state) => state.generalSession);
  const contestsQuery = useQuery({
    queryKey: ['public-contests'],
    queryFn: getPublicContests,
    refetchInterval: 15_000,
  });

  const contests = sortContestsByStartAt(contestsQuery.data ?? []);
  const participantContestIds = new Set(
    generalSession?.participantContests.map(
      (item) => item.contest.contest_id,
    ) ?? [],
  );
  const visibleContests =
    filter === 'mine'
      ? contests.filter((contest) =>
          participantContestIds.has(contest.contest_id),
        )
      : contests;

  return (
    <PageLayout>
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div className="grid gap-2">
          <span className="text-zoj-blue text-sm font-bold">
            {publicPageText.contests.eyebrow}
          </span>
          <h1 className="text-3xl font-black tracking-normal break-keep text-slate-950">
            {publicPageText.contests.title}
          </h1>
          <p className="text-sm leading-6 font-medium text-slate-500">
            {publicPageText.contests.description}
          </p>
        </div>

        <div className="inline-flex rounded-full bg-slate-100 p-1">
          {[
            ['all', '전체'],
            ['mine', '내 대회'],
          ].map(([value, label]) => (
            <button
              className={[
                'h-8 rounded-full px-5 text-sm font-black transition',
                filter === value
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-700',
              ].join(' ')}
              key={value}
              onClick={() => setFilter(value as ContestFilter)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </header>

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

      <ul className="grid grid-cols-1 gap-2.5">
        {visibleContests.map((contest) => (
          <ContestListItem
            key={contest.contest_id}
            {...toContestCardData(contest)}
          />
        ))}
      </ul>

      {!contestsQuery.isLoading && visibleContests.length === 0 && (
        <PageNotice
          message={
            filter === 'mine'
              ? '참가 가능한 내 대회가 없습니다.'
              : publicPageText.contests.empty
          }
          status="idle"
        />
      )}
    </PageLayout>
  );
}
