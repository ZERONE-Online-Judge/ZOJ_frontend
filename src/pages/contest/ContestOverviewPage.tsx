import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeading } from '@/components/common/PageLayout';
import ContestPageFrame from '@/components/contest/ContestPageFrame';
import ContestPageNavigation from '@/components/contest/ContestPageNavigation';
import ContestPageShell from '@/components/contest/ContestPageShell';
import NoticeSection from '@/components/main/NoticeSection';
import {
  canViewContestResource,
  contestAccessPhase,
  contestResourceAccess,
  contestResourceAccessMessage,
} from '@/domains/contestAdministration/logic';
import type { Contest, Division } from '@/domains/contestAdministration/types';
import {
  contestQueryKeys,
  generalSessionQueryIdentity,
  participantSessionQueryIdentity,
} from '@/domains/contestRuntime/queryKeys';
import { useContestParticipantSession } from '@/domains/contestRuntime/useContestParticipantSession';
import { getContestNotices } from '@/domains/serviceCommunication/api';
import type { ContestNotice } from '@/domains/serviceCommunication/types';
import { formatDateTime } from '@/shared/lib/dateTime';
import PageNotice from '@/shared/ui/PageNotice';
import { SvgIcon } from '@/utils/Icons';

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
    <article className="animate-panel-enter zoj-surface zoj-surface-hover flex h-52 flex-col justify-between rounded-lg border border-slate-200 bg-white px-8 py-7">
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

function formatOpenCountdown(startAt: string, now: number) {
  const diff = Math.max(0, new Date(startAt).getTime() - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);

  if (days > 0) return `D-${days}, ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

function formatCompactCountdown(value: string, now: number) {
  const diff = Math.max(0, new Date(value).getTime() - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatOverviewDateTime(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const parts = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';

  return `${part('year')}. ${part('month')}. ${part('day')}. ${part(
    'dayPeriod',
  )} ${part('hour')}:${part('minute')}`;
}

function getTimerCard(contest: Contest, now: number) {
  const startAt = new Date(contest.start_at).getTime();
  const endAt = new Date(contest.end_at).getTime();
  const freezeAt = new Date(contest.freeze_at).getTime();

  if (Number.isNaN(startAt) || Number.isNaN(endAt)) {
    return { subtitle: '시간 미정', title: '일정 미정' };
  }
  if (now < startAt) {
    return {
      subtitle: '오픈까지',
      title: formatOpenCountdown(contest.start_at, now),
    };
  }
  if (now >= endAt) return { subtitle: '대회 종료', title: '종료됨' };

  if (!Number.isNaN(freezeAt) && now < freezeAt) {
    return {
      subtitle: `프리즈까지 ${formatCompactCountdown(contest.freeze_at, now)}`,
      title: `종료까지 ${formatCompactCountdown(contest.end_at, now)}`,
    };
  }

  return {
    subtitle: '스코어보드 프리즈 중',
    title: `종료까지 ${formatCompactCountdown(contest.end_at, now)}`,
  };
}

function getFreezeSummary(contest: Contest, now: number) {
  const freezeAt = new Date(contest.freeze_at).getTime();
  const endAt = new Date(contest.end_at).getTime();

  if (Number.isNaN(freezeAt)) return '프리즈 시간 미정';
  if (now < freezeAt) {
    return `프리즈까지 ${formatCompactCountdown(contest.freeze_at, now)}`;
  }
  if (!Number.isNaN(endAt) && now < endAt) {
    return `프리즈 중 · 종료까지 ${formatCompactCountdown(contest.end_at, now)}`;
  }
  return '프리즈 종료';
}

function sortNotices(notices: ContestNotice[]) {
  return [...notices].sort(
    (a, b) =>
      Number(b.emergency) - Number(a.emergency) ||
      Number(b.pinned) - Number(a.pinned) ||
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
  );
}

function noticeBadgeLabel(notice: ContestNotice) {
  const base = notice.pinned ? '고정' : '공지';
  return notice.emergency ? `${base} · 긴급` : base;
}

function NoticePreview({
  contestId,
  notices,
  isError,
  isLoading,
  unavailableMessage,
}: {
  contestId: string;
  notices: ContestNotice[];
  isError: boolean;
  isLoading: boolean;
  unavailableMessage?: string;
}) {
  return (
    <NoticeSection
      notices={notices.map((notice) => ({
        date: formatDateTime(notice.published_at),
        href: `/contests/${contestId}/board?noticeId=${encodeURIComponent(
          notice.contest_notice_id,
        )}`,
        label: noticeBadgeLabel(notice),
        title: notice.title,
        tone: notice.pinned ? 'pinned' : 'default',
      }))}
      title="공지사항"
      titleHref={`/contests/${contestId}/board`}
      titleSize="small"
    >
      {unavailableMessage || isLoading || isError || notices.length === 0 ? (
        <div className="border-y border-slate-200">
          {unavailableMessage ? (
            <PageNotice message={unavailableMessage} status="idle" />
          ) : null}
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
          {!unavailableMessage &&
          !isLoading &&
          !isError &&
          notices.length === 0 ? (
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
  const {
    activeParticipantSession,
    ensureParticipantSession,
    generalSession,
    participantContest,
    participantSession,
    token,
  } = useContestParticipantSession(contest.contest_id);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  const noticeAccess = contestResourceAccess(contest, 'notice');
  const hasParticipantAccess = Boolean(
    participantContest || activeParticipantSession,
  );
  const generalQueryIdentity = generalSessionQueryIdentity(generalSession);
  const participantQueryIdentity = participantSessionQueryIdentity(
    activeParticipantSession,
    participantContest,
  );
  const canViewNotices =
    contestAccessPhase(contest) !== 'ended' ||
    canViewContestResource(contest, hasParticipantAccess, noticeAccess);
  const noticesQuery = useQuery({
    enabled: canViewNotices,
    queryKey: contestQueryKeys.notices(
      contest.contest_id,
      generalQueryIdentity,
      participantContest?.contest.contest_id,
      participantQueryIdentity,
    ),
    queryFn: async () => {
      const session =
        participantContest ||
        activeParticipantSession ||
        noticeAccess === 'participants'
          ? await ensureParticipantSession()
          : null;
      return getContestNotices(
        contest.contest_id,
        session?.accessToken ?? token,
      );
    },
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  });
  const notices = useMemo(
    () => sortNotices(noticesQuery.data ?? []),
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
  const timerCard = getTimerCard(contest, now);

  return (
    <ContestPageFrame>
      <PageHeading
        className="gap-3"
        description={divisionName}
        title={contest.title}
        variant="contest"
      />

      <ContestPageNavigation contest={contest} contestId={contest.contest_id} />

      <section className="mt-8 grid gap-8 md:grid-cols-3">
        <OverviewCard icon="user" subtitle={memberEmail} title={memberName} />
        <OverviewCard icon="team" subtitle={divisionName} title={teamName} />
        <OverviewCard
          icon="timer"
          subtitle={timerCard.subtitle}
          title={timerCard.title}
        />
      </section>

      <section className="animate-panel-enter zoj-surface mt-6 grid gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 sm:grid-cols-3">
        <div className="grid gap-1">
          <span className="text-xs font-black text-slate-400">시작 시간</span>
          <strong className="text-sm font-black text-slate-950">
            {formatOverviewDateTime(contest.start_at)}
          </strong>
        </div>
        <div className="grid gap-1">
          <span className="text-xs font-black text-slate-400">마감 시간</span>
          <strong className="text-sm font-black text-slate-950">
            {formatOverviewDateTime(contest.end_at)}
          </strong>
        </div>
        <div className="grid gap-1">
          <span className="text-xs font-black text-slate-400">
            스코어보드 프리즈
          </span>
          <strong className="text-sm font-black text-slate-950">
            {formatOverviewDateTime(contest.freeze_at)} ·{' '}
            {getFreezeSummary(contest, now)}
          </strong>
        </div>
      </section>

      <div className="mt-8">
        <NoticePreview
          contestId={contest.contest_id}
          isError={noticesQuery.isError}
          isLoading={canViewNotices && noticesQuery.isPending}
          notices={notices}
          unavailableMessage={
            canViewNotices
              ? undefined
              : contestResourceAccessMessage(
                  contest,
                  'notice',
                  hasParticipantAccess,
                )
          }
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
