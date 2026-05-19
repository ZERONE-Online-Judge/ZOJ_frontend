import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import PageLayout from '@/components/common/PageLayout';
import ContestListItem from '@/components/ui/ContestListItem';
import { publicPageText } from '@/data/uiText';
import {
  getOperatorContests,
  getPublicContests,
} from '@/domains/contestAdministration/api';
import { contestAccessPhase } from '@/domains/contestAdministration/logic';
import { toContestCardData } from '@/domains/contestAdministration/presentation';
import type { Contest } from '@/domains/contestAdministration/types';
import { tokenQueryIdentity } from '@/domains/identityAccess/queryIdentity';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';
import PageNotice from '@/shared/ui/PageNotice';

type ContestFilter = 'all' | 'mine';
type ContestSectionKey = 'running' | 'upcoming' | 'ended';

type ContestSection = {
  contests: Contest[];
  description: string;
  key: ContestSectionKey;
  title: string;
};

const contestSections: Omit<ContestSection, 'contests'>[] = [
  {
    description: '현재 참가하거나 운영 중인 대회입니다.',
    key: 'running',
    title: '진행중 대회',
  },
  {
    description: '시작 전이거나 일정이 준비 중인 대회입니다.',
    key: 'upcoming',
    title: '운영예정 대회',
  },
  {
    description: '이미 종료된 대회입니다.',
    key: 'ended',
    title: '이미 종료된 대회',
  },
];

function sectionKeyForContest(contest: Contest): ContestSectionKey {
  const phase = contestAccessPhase(contest);
  if (phase === 'running') return 'running';
  if (phase === 'ended') return 'ended';
  return 'upcoming';
}

function contestSortDate(contest: Contest) {
  const sectionKey = sectionKeyForContest(contest);
  const value = sectionKey === 'ended' ? contest.end_at : contest.start_at;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortContestsByRecentDate(contests: Contest[]) {
  return [...contests].sort((a, b) => contestSortDate(b) - contestSortDate(a));
}

export default function ContestsPage() {
  const [filter, setFilter] = useState<ContestFilter>('all');
  const generalSession = useSessionStore((state) => state.generalSession);
  const operatorToken = generalSession?.operatorSession?.accessToken;
  const operatorQueryIdentity = tokenQueryIdentity(operatorToken);
  const contestsQuery = useQuery({
    queryKey: ['public-contests'],
    queryFn: getPublicContests,
    refetchInterval: 15_000,
  });
  const operatorContestsQuery = useQuery({
    enabled: Boolean(operatorToken),
    queryKey: ['operator', 'contests', operatorQueryIdentity],
    queryFn: () => getOperatorContests(operatorToken!),
    refetchInterval: 15_000,
  });

  const operatorContests =
    operatorContestsQuery.data ??
    generalSession?.operatorContests.map((entry) => entry.contest) ??
    [];
  const contestById = new Map<string, Contest>();
  for (const contest of contestsQuery.data ?? []) {
    contestById.set(contest.contest_id, contest);
  }
  for (const contest of operatorContests) {
    contestById.set(contest.contest_id, contest);
  }
  const contests = sortContestsByRecentDate([...contestById.values()]);
  const participantContestIds = new Set(
    generalSession?.participantContests.map(
      (item) => item.contest.contest_id,
    ) ?? [],
  );
  const operatorContestIds = new Set(
    operatorContests.map((contest) => contest.contest_id),
  );
  const visibleContests =
    filter === 'mine'
      ? contests.filter((contest) =>
          participantContestIds.has(contest.contest_id) ||
          operatorContestIds.has(contest.contest_id),
        )
      : contests;
  const sections = contestSections.map((section) => ({
    ...section,
    contests: sortContestsByRecentDate(
      visibleContests.filter(
        (contest) => sectionKeyForContest(contest) === section.key,
      ),
    ),
  }));

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
      {operatorContestsQuery.isError && (
        <PageNotice
          message="운영 권한 대회를 불러오지 못했습니다."
          status="error"
        />
      )}

      <div className="grid gap-8">
        {sections.map((section) =>
          section.contests.length > 0 ? (
            <ContestSectionList
              contests={section.contests}
              description={section.description}
              key={section.key}
              operatorContestIds={operatorContestIds}
              title={section.title}
            />
          ) : null,
        )}
      </div>

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

function ContestSectionList({
  contests,
  description,
  operatorContestIds,
  title,
}: {
  contests: Contest[];
  description: string;
  operatorContestIds: Set<string>;
  title: string;
}) {
  return (
    <section className="grid gap-3">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          <p className="text-sm font-medium text-slate-500">{description}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
          {contests.length}개
        </span>
      </header>
      <ul className="grid grid-cols-1 gap-2.5">
        {contests.map((contest) => {
          const isOperatorContest = operatorContestIds.has(contest.contest_id);
          return (
            <ContestListItem
              href={
                isOperatorContest
                  ? `/operator/contests/${contest.contest_id}`
                  : undefined
              }
              key={contest.contest_id}
              {...toContestCardData(contest)}
            />
          );
        })}
      </ul>
    </section>
  );
}
