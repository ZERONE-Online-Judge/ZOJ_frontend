import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import ContestPageFrame from '@/components/contest/ContestPageFrame';
import ContestPageShell from '@/components/contest/ContestPageShell';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';
import {
  getContestProblems,
  getDivisionProblems,
} from '@/domains/problemManagement/api';
import {
  getDivisionScoreboard,
  getScoreboard,
} from '@/domains/submissionScoreboard/api';
import type { ScoreboardProblemScore } from '@/domains/submissionScoreboard/types';
import { createParticipantSessionFromGeneralToken } from '@/domains/teamParticipation/api';
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

function ContestProblemsContent({ contestId }: { contestId: string }) {
  const generalSession = useSessionStore((state) => state.generalSession);
  const participantSession = useSessionStore(
    (state) => state.participantSession,
  );
  const setParticipantSession = useSessionStore(
    (state) => state.setParticipantSession,
  );
  const participantContest = generalSession?.participantContests.find(
    (item) => item.contest.contest_id === contestId,
  );

  const problemsQuery = useQuery({
    queryKey: ['contest-problems', contestId, generalSession?.accessToken],
    queryFn: async () => {
      if (participantSession?.contestId === contestId) {
        return getDivisionProblems(
          contestId,
          participantSession.division.division_id,
          participantSession.accessToken,
        );
      }

      if (generalSession?.accessToken && participantContest) {
        const session = await createParticipantSessionFromGeneralToken(
          contestId,
          generalSession.accessToken,
        );
        setParticipantSession(session);

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
    queryKey: [
      'contest-scoreboard',
      contestId,
      generalSession?.accessToken,
      participantSession?.contestId,
      participantSession?.division.division_id,
      participantSession?.accessToken,
    ],
    queryFn: async () => {
      if (participantSession?.contestId === contestId) {
        return getDivisionScoreboard(
          contestId,
          participantSession.division.division_id,
          participantSession.accessToken,
        );
      }

      return getScoreboard(contestId, generalSession?.accessToken);
    },
    refetchInterval: 10_000,
  });

  const problems = problemsQuery.data ?? [];
  const teamName =
    participantContest?.team.team_name ??
    (participantSession?.contestId === contestId
      ? participantSession.team.team_name
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

  return (
    <ContestPageFrame>
      <header>
        <h1 className="text-4xl font-black tracking-normal text-slate-950">
          문제집
        </h1>
        <p className="mt-4 text-base font-medium text-slate-400">
          문제별 제한, 제출 여부, 최근 결과를 빠르게 확인합니다.
        </p>
      </header>

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

        <div className="overflow-x-auto border border-slate-200 bg-white">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-white text-xs font-black text-slate-950">
                <th className="w-24 px-6 py-4">문제 번호</th>
                <th className="px-6 py-4">제목</th>
                <th className="w-36 px-6 py-4">정보</th>
                <th className="w-32 px-6 py-4">제한 시간</th>
                <th className="w-36 px-6 py-4">제한 메모리</th>
                <th className="w-28 px-6 py-4">배점</th>
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
                    <td className="px-6 py-4 font-medium text-slate-950">
                      {problem.max_score}점
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

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
        <ContestProblemsContent contestId={contest.contest_id} />
      )}
    </ContestPageShell>
  );
}
