import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeading } from '@/components/common/PageLayout';
import ContestPageFrame from '@/components/contest/ContestPageFrame';
import ContestPageShell from '@/components/contest/ContestPageShell';
import NoticeSection from '@/components/main/NoticeSection';
import type { Contest, Division } from '@/domains/contestAdministration/types';
import { contestQueryKeys } from '@/domains/contestRuntime/queryKeys';
import { useContestParticipantSession } from '@/domains/contestRuntime/useContestParticipantSession';
import { getContestNotices } from '@/domains/serviceCommunication/api';
import type { ContestNotice } from '@/domains/serviceCommunication/types';
import { formatDateTime, formatTime, timeLeft } from '@/shared/lib/dateTime';
import PageNotice from '@/shared/ui/PageNotice';
import { SvgIcon } from '@/utils/Icons';

const overviewTabs = [
  { label: '개요', path: '' },
  { label: '문제집', path: 'problems' },
  { label: '채점현황', path: 'submissions' },
  { label: '스코어보드', path: 'scoreboard' },
  { label: '게시판', path: 'board' },
] as const;

type OverviewIcon = 'user' | 'team' | 'timer';

type OverviewCardProps = {
  icon: OverviewIcon;
  title: string;
  subtitle: string;
};

function OverviewIconBadge({ icon }: { icon: OverviewIcon }) {
  return (
    <span className="flex size-12 items-center justify-center rounded-full bg-[#eee8ff] text-[#7c5cff]">
      {icon === 'user' ? (
        <svg
          aria-hidden="true"
          className="size-7"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 12.25a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM5.75 19.25a6.25 6.25 0 0 1 12.5 0"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.1"
          />
        </svg>
      ) : null}
      {icon === 'team' ? (
        <svg
          aria-hidden="true"
          className="size-7"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="M8 4.75h8v6.5H8zM5.5 7.5H8v8H5.5zM16 7.5h2.5v8H16zM12 11.25v5.5M8.75 16.75h6.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      ) : null}
      {icon === 'timer' ? <SvgIcon name="timer" size={28} /> : null}
    </span>
  );
}

function OverviewCard({ icon, title, subtitle }: OverviewCardProps) {
  return (
    <article className="flex h-52 flex-col justify-between rounded-lg border border-slate-200 bg-white px-8 py-7">
      <OverviewIconBadge icon={icon} />
      <div>
        <h2 className="truncate text-2xl font-black tracking-normal text-slate-950">
          {title}
        </h2>
        <p className="mt-2 truncate text-lg font-medium text-slate-400">
          {subtitle}
        </p>
      </div>
    </article>
  );
}

function getRemainingTime(contest: Contest, now: number) {
  const startAt = new Date(contest.start_at).getTime();
  const endAt = new Date(contest.end_at).getTime();

  if (Number.isNaN(startAt) || Number.isNaN(endAt)) return '일정 미정';
  if (now < startAt) return timeLeft(contest.start_at);
  if (now >= endAt) return '종료됨';

  return timeLeft(contest.end_at);
}

function sortNotices(notices: ContestNotice[]) {
  return [...notices].sort(
    (a, b) =>
      Number(b.emergency) - Number(a.emergency) ||
      Number(b.pinned) - Number(a.pinned) ||
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
  );
}

function NoticePreview({
  contestId,
  notices,
  isError,
  isLoading,
}: {
  contestId: string;
  notices: ContestNotice[];
  isError: boolean;
  isLoading: boolean;
}) {
  return (
    <NoticeSection
      compact
      notices={notices.map((notice) => ({
        date: formatDateTime(notice.published_at),
        href: `/contests/${contestId}/board`,
        label: notice.emergency ? '긴급' : notice.pinned ? '고정' : '공지',
        title: notice.title,
      }))}
      title="공지사항"
      titleHref={`/contests/${contestId}/board`}
    >
      {isLoading || isError || notices.length === 0 ? (
        <div className="border-y border-slate-200">
          {isLoading ? (
            <PageNotice
              message="공지사항을 불러오는 중입니다."
              status="loading"
            />
          ) : null}
          {isError ? (
            <PageNotice
              message="공지사항을 불러오지 못했습니다."
              status="error"
            />
          ) : null}
          {!isLoading && !isError && notices.length === 0 ? (
            <PageNotice message="표시할 공지사항이 없습니다." status="idle" />
          ) : null}
        </div>
      ) : null}
    </NoticeSection>
  );
}

function ContestOverviewContent({
  contest,
  divisions,
}: {
  contest: Contest;
  divisions: Division[];
}) {
  const { generalSession, participantContest, participantSession, token } =
    useContestParticipantSession(contest.contest_id);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  const noticesQuery = useQuery({
    queryKey: contestQueryKeys.notices(contest.contest_id, token),
    queryFn: () => getContestNotices(contest.contest_id, token),
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  });
  const notices = useMemo(
    () => sortNotices(noticesQuery.data ?? []).slice(0, 3),
    [noticesQuery.data],
  );
  const teamName =
    participantContest?.team.team_name ??
    (participantSession?.contestId === contest.contest_id
      ? participantSession.team.team_name
      : '팀 정보 없음');
  const memberName =
    participantContest?.member.name ??
    participantSession?.member.name ??
    generalSession?.account.display_name ??
    '로그인 필요';
  const memberEmail =
    participantContest?.member.email ??
    participantSession?.member.email ??
    generalSession?.account.email ??
    '참가자 이메일';
  const divisionName =
    participantContest?.division.name ??
    participantSession?.division.name ??
    divisions[0]?.name ??
    'division';
  const remainingTime = getRemainingTime(contest, now);

  return (
    <ContestPageFrame>
      <PageHeading
        className="gap-3"
        description={divisionName}
        title={contest.title}
        variant="contest"
      />

      <nav aria-label="대회 메뉴" className="mt-8">
        <ul className="flex flex-wrap items-center gap-3">
          {overviewTabs.map((tab) => {
            const to = tab.path
              ? `/contests/${contest.contest_id}/${tab.path}`
              : `/contests/${contest.contest_id}`;

            return (
              <li key={tab.path || 'overview'}>
                <NavLink
                  className={({ isActive }) =>
                    [
                      'inline-flex h-8 items-center rounded-full border px-5 text-sm font-bold transition',
                      isActive
                        ? 'border-slate-950 bg-slate-950 text-white'
                        : 'border-slate-200 bg-white text-slate-950 hover:border-slate-400',
                    ].join(' ')
                  }
                  end={!tab.path}
                  to={to}
                >
                  {tab.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <section className="mt-8 grid gap-8 md:grid-cols-3">
        <OverviewCard icon="user" subtitle={memberEmail} title={memberName} />
        <OverviewCard icon="team" subtitle={divisionName} title={teamName} />
        <OverviewCard
          icon="timer"
          subtitle={`freeze ${formatTime(contest.freeze_at)}`}
          title={remainingTime}
        />
      </section>

      <div className="mt-8">
        <NoticePreview
          contestId={contest.contest_id}
          isError={noticesQuery.isError}
          isLoading={noticesQuery.isLoading}
          notices={notices}
        />
      </div>
    </ContestPageFrame>
  );
}

export default function ContestOverviewPage() {
  return (
    <ContestPageShell>
      {({ contest, divisions }) => (
        <ContestOverviewContent contest={contest} divisions={divisions} />
      )}
    </ContestPageShell>
  );
}
