import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import { PageHeading } from '@/components/common/PageLayout';
import ContestPageFrame from '@/components/contest/ContestPageFrame';
import ContestPageShell from '@/components/contest/ContestPageShell';
import { contestQueryKeys } from '@/domains/contestRuntime/queryKeys';
import { useContestParticipantSession } from '@/domains/contestRuntime/useContestParticipantSession';
import {
  canViewContestResource,
  contestAccessPhase,
  participantProblemEmptyMessage,
} from '@/domains/contestAdministration/logic';
import type { Contest } from '@/domains/contestAdministration/types';
import {
  getContestProblems,
  getDivisionProblems,
} from '@/domains/problemManagement/api';
import {
  getDivisionScoreboard,
  getScoreboard,
} from '@/domains/submissionScoreboard/api';
import type { ScoreboardProblemScore } from '@/domains/submissionScoreboard/types';
import PageNotice from '@/shared/ui/PageNotice';

const problemTabs = [
  { label: '개요', path: '' },
  { label: '문제집', path: 'problems' },
  { label: '채점현황', path: 'submissions' },
  { label: '스코어보드', path: 'scoreboard' },
  { label: '게시판', path: 'board' },
] as const;

type ProblemStatus = 'success' | 'failed' | 'pending';

function problemStatus(score?: ScoreboardProblemScore): ProblemStatus {
  if (score?.solved) return 'success';
  if (score && score.attempts > 0) return 'failed';

  return 'pending';
}

function ProblemStatusBadge({ status }: { status: ProblemStatus }) {
  const labels = {
    success: '성공',
    failed: '실패',
    pending: '미해결',
  };
  const classNames = {
    success: 'bg-emerald-50 text-emerald-700',
    failed: 'bg-red-50 text-red-700',
    pending: 'bg-slate-100 text-slate-500',
  };

  return (
    <span
      className={[
        'inline-flex h-7 items-center rounded px-3 text-xs font-black',
        classNames[status],
      ].join(' ')}
    >
      {labels[status]}
    </span>
  );
}

function isWaAcContest(contest: Contest) {
  const format = [
    contest.scoring_type,
    contest.scoring_mode,
    contest.format_type,
    contest.format,
    contest.contest_type,
  ]
    .find((value) => typeof value === 'string' && value.trim())
    ?.trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  return [
    'wa_ac',
    'wa/ac',
    'ac',
    'acm',
    'icpc',
    'pass_fail',
    'binary',
    'accepted_rejected',
  ].includes(format ?? '');
}

function ContestProblemsContent({
  contest,
  contestId,
}: {
  contest: Contest;
  contestId: string;
}) {
  const {
    activeParticipantSession,
    ensureParticipantSession,
    generalSession,
    participantContest,
  } = useContestParticipantSession(contestId);
  const hasSessionAccess = Boolean(participantContest);
  const shouldUseParticipantScope =
    hasSessionAccess && contestAccessPhase(contest) !== 'ended';
  const canViewProblems = canViewContestResource(
    contest,
    hasSessionAccess,
    contest.problem_public_after_end,
  );
  const canViewScoreboard = canViewContestResource(
    contest,
    hasSessionAccess,
    contest.scoreboard_public_after_end,
  );

  const problemsQuery = useQuery({
    enabled: canViewProblems,
    queryKey: contestQueryKeys.problems(
      contestId,
      generalSession?.accessToken,
      shouldUseParticipantScope ? activeParticipantSession?.contestId : undefined,
      shouldUseParticipantScope
        ? activeParticipantSession?.division.division_id
        : undefined,
      shouldUseParticipantScope ? activeParticipantSession?.accessToken : undefined,
    ),
    queryFn: async () => {
      const session = shouldUseParticipantScope
        ? await ensureParticipantSession()
        : null;
      if (session && shouldUseParticipantScope) {
        return getDivisionProblems(
          contestId,
          session.division.division_id,
          session.accessToken,
        );
      }

      return getContestProblems(contestId, generalSession?.accessToken);
    },
    refetchInterval: 15_000,
  });

  const scoreboardQuery = useQuery({
    enabled: canViewProblems && canViewScoreboard,
    queryKey: contestQueryKeys.scoreboard(
      contestId,
      generalSession?.accessToken,
      shouldUseParticipantScope ? activeParticipantSession?.contestId : undefined,
      shouldUseParticipantScope
        ? activeParticipantSession?.division.division_id
        : undefined,
      shouldUseParticipantScope ? activeParticipantSession?.accessToken : undefined,
    ),
    queryFn: async () => {
      const session = shouldUseParticipantScope
        ? await ensureParticipantSession()
        : null;
      if (session && shouldUseParticipantScope) {
        return getDivisionScoreboard(
          contestId,
          session.division.division_id,
          session.accessToken,
        );
      }

      return getScoreboard(contestId, generalSession?.accessToken);
    },
    refetchInterval: 10_000,
  });

  const problems = problemsQuery.data ?? [];
  const teamName =
    participantContest?.team.team_name ??
    (activeParticipantSession?.contestId === contestId
      ? activeParticipantSession.team.team_name
      : null);
  const myScoreboardRow = scoreboardQuery.data?.rows.find((row) =>
    teamName ? row.team_name === teamName : false,
  );
  const scoreByProblemCode = new Map(
    (myScoreboardRow?.problem_scores ?? []).map((score) => [
      score.problem_code,
      score,
    ]),
  );
  const shouldShowProblemScore = !isWaAcContest(contest);

  return (
    <ContestPageFrame>
      <PageHeading
        className="gap-4"
        description="문제별 제한, 제출 여부, 최근 결과를 빠르게 확인합니다."
        title="문제집"
        variant="contest"
      />

      <nav aria-label="대회 메뉴" className="mt-8">
        <ul className="flex flex-wrap items-center gap-3">
          {problemTabs.map((tab) => {
            const to = tab.path
              ? `/contests/${contestId}/${tab.path}`
              : `/contests/${contestId}`;

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

      <div className="mt-9">
        {!canViewProblems ? (
          <PageNotice
            message={
              participantProblemEmptyMessage(
                contest,
                hasSessionAccess,
                contest.problem_public_after_end,
              ) ?? '문제집을 볼 수 없습니다.'
            }
            status="idle"
          />
        ) : null}
        {problemsQuery.isLoading && (
          <PageNotice
            message="문제 목록을 불러오는 중입니다."
            status="loading"
          />
        )}
        {problemsQuery.isError && (
          <PageNotice
            message="문제 목록을 불러오지 못했습니다."
            status="error"
          />
        )}

        {canViewProblems ? (
          <div className="overflow-x-auto border border-slate-200 bg-white">
            <table
              className={[
                'w-full border-collapse text-left text-sm',
                shouldShowProblemScore ? 'min-w-[920px]' : 'min-w-[800px]',
              ].join(' ')}
            >
              <thead>
                <tr className="border-b border-slate-200 bg-white text-xs font-black text-slate-950">
                  <th className="w-24 px-6 py-4">문제 번호</th>
                  <th className="px-6 py-4">제목</th>
                  <th className="w-36 px-6 py-4">정보</th>
                  <th className="w-32 px-6 py-4">제한 시간</th>
                  <th className="w-36 px-6 py-4">제한 메모리</th>
                  {shouldShowProblemScore ? (
                    <th className="w-28 px-6 py-4">배점</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {problems.map((problem) => {
                  const score = scoreByProblemCode.get(problem.problem_code);

                  return (
                    <tr
                      className="border-b border-slate-200 last:border-b-0 odd:bg-slate-50/80"
                      key={problem.problem_id}
                    >
                      <td className="px-6 py-4 font-bold text-slate-950">
                        {problem.problem_code}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-950">
                        <Link
                          className="hover:text-zoj-blue transition"
                          to={`/contests/${contestId}/problems/${problem.problem_id}`}
                        >
                          {problem.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <ProblemStatusBadge status={problemStatus(score)} />
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-950">
                        {problem.time_limit_ms / 1000}초
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-950">
                        {problem.memory_limit_mb} MB
                      </td>
                      {shouldShowProblemScore ? (
                        <td className="px-6 py-4 font-medium text-slate-950">
                          {problem.max_score}점
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {!problemsQuery.isLoading && problems.length === 0 ? (
          <PageNotice message="표시할 문제가 없습니다." status="idle" />
        ) : null}
      </div>
    </ContestPageFrame>
  );
}

export default function ContestProblemsPage() {
  return (
    <ContestPageShell>
      {({ contest }) => (
        <ContestProblemsContent
          contest={contest}
          contestId={contest.contest_id}
        />
      )}
    </ContestPageShell>
  );
}
