import { useQuery } from '@tanstack/react-query';
import ContestPageFrame from '@/components/contest/ContestPageFrame';
import ContestPageShell from '@/components/contest/ContestPageShell';
import ContestScoreboardTable from '@/components/contest/scoreboard/ContestScoreboardTable';
import ContestScoreboardTabs from '@/components/contest/scoreboard/ContestScoreboardTabs';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';
import {
  getContestProblems,
  getDivisionProblems,
} from '@/domains/problemManagement/api';
import {
  getDivisionScoreboard,
  getScoreboard,
} from '@/domains/submissionScoreboard/api';
import { createParticipantSessionFromGeneralToken } from '@/domains/teamParticipation/api';
import PageNotice from '@/shared/ui/PageNotice';

function ContestScoreboardContent({ contestId }: { contestId: string }) {
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
  const activeParticipantSession =
    participantSession?.contestId === contestId ? participantSession : null;
  const divisionName =
    participantContest?.division.name ??
    activeParticipantSession?.division.name;

  const problemsQuery = useQuery({
    queryKey: [
      'contest-problems',
      contestId,
      generalSession?.accessToken,
      participantSession?.contestId,
      participantSession?.division.division_id,
      participantSession?.accessToken,
    ],
    queryFn: async () => {
      if (activeParticipantSession) {
        return getDivisionProblems(
          contestId,
          activeParticipantSession.division.division_id,
          activeParticipantSession.accessToken,
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
      if (activeParticipantSession) {
        return getDivisionScoreboard(
          contestId,
          activeParticipantSession.division.division_id,
          activeParticipantSession.accessToken,
        );
      }

      if (generalSession?.accessToken && participantContest) {
        const session = await createParticipantSessionFromGeneralToken(
          contestId,
          generalSession.accessToken,
        );
        setParticipantSession(session);

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
  const rows = scoreboardQuery.data?.rows ?? [];
  const problems = problemsQuery.data ?? [];
  const resolvedDivisionName =
    scoreboardQuery.data?.division.name ?? divisionName;

  return (
    <ContestPageFrame>
      <header>
        <h1 className="text-4xl font-black tracking-normal text-slate-950">
          스코어보드
        </h1>
        <p className="mt-4 text-base font-medium text-slate-400">
          {resolvedDivisionName
            ? `${resolvedDivisionName} 기준 순위입니다.`
            : '유형 없음 유형 기준 순위입니다.'}
        </p>
      </header>

      <ContestScoreboardTabs contestId={contestId} />

      <div className="mt-9">
        {scoreboardQuery.isLoading && (
          <PageNotice
            message="스코어보드를 불러오는 중입니다."
            status="loading"
          />
        )}
        {scoreboardQuery.isError && (
          <PageNotice
            message="스코어보드를 불러오지 못했습니다."
            status="error"
          />
        )}
        {scoreboardQuery.data?.frozen ? (
          <PageNotice
            message="현재 공개 스코어보드는 프리즈된 상태입니다."
            status="ready"
          />
        ) : null}

        <ContestScoreboardTable problems={problems} rows={rows} />

        {!scoreboardQuery.isLoading && rows.length === 0 ? (
          <PageNotice message="표시할 스코어보드가 없습니다." status="idle" />
        ) : null}
      </div>
    </ContestPageFrame>
  );
}

export default function ContestScoreboardPage() {
  return (
    <ContestPageShell>
      {({ contest }) => (
        <ContestScoreboardContent contestId={contest.contest_id} />
      )}
    </ContestPageShell>
  );
}
