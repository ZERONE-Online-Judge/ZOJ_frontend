import { useQuery } from '@tanstack/react-query';
import ContestPageFrame from '@/components/contest/ContestPageFrame';
import ContestPageShell from '@/components/contest/ContestPageShell';
import ContestSubmissionsTable from '@/components/contest/submissions/ContestSubmissionsTable';
import ContestSubmissionsTabs from '@/components/contest/submissions/ContestSubmissionsTabs';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';
import { getContestProblems } from '@/domains/problemManagement/api';
import { listSubmissions } from '@/domains/submissionScoreboard/api';
import { createParticipantSessionFromGeneralToken } from '@/domains/teamParticipation/api';
import PageNotice from '@/shared/ui/PageNotice';

function ContestSubmissionsContent({ contestId }: { contestId: string }) {
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
  const fallbackTeamName =
    participantContest?.team.team_name ??
    activeParticipantSession?.team.team_name;
  const fallbackMemberName =
    participantContest?.member.name ?? activeParticipantSession?.member.name;

  const problemsQuery = useQuery({
    queryKey: ['contest-problems', contestId, generalSession?.accessToken],
    queryFn: () => getContestProblems(contestId, generalSession?.accessToken),
  });

  const submissionsQuery = useQuery({
    queryKey: [
      'contest-submissions',
      contestId,
      generalSession?.accessToken,
      participantSession?.contestId,
      participantSession?.accessToken,
    ],
    queryFn: async () => {
      if (activeParticipantSession) {
        return listSubmissions(contestId, activeParticipantSession.accessToken);
      }

      if (generalSession?.accessToken && participantContest) {
        const session = await createParticipantSessionFromGeneralToken(
          contestId,
          generalSession.accessToken,
        );
        setParticipantSession(session);

        return listSubmissions(contestId, session.accessToken);
      }

      return listSubmissions(contestId, generalSession?.accessToken);
    },
    refetchInterval: 5_000,
  });
  const submissions = submissionsQuery.data ?? [];
  const problems = problemsQuery.data ?? [];

  return (
    <ContestPageFrame>
      <header>
        <h1 className="text-4xl font-black tracking-normal text-slate-950">
          채점현황
        </h1>
        <p className="mt-4 text-base font-medium text-slate-400">
          대회 중에는 로그인한 참가팀의 제출만 확인합니다.
        </p>
      </header>

      <ContestSubmissionsTabs contestId={contestId} />

      <div className="mt-9">
        {submissionsQuery.isLoading && (
          <PageNotice
            message="제출 현황을 불러오는 중입니다."
            status="loading"
          />
        )}
        {submissionsQuery.isError && (
          <PageNotice
            message="제출 현황을 불러오지 못했습니다."
            status="error"
          />
        )}

        <ContestSubmissionsTable
          fallbackMemberName={fallbackMemberName}
          fallbackTeamName={fallbackTeamName}
          problems={problems}
          submissions={submissions}
        />

        {!submissionsQuery.isLoading && submissions.length === 0 ? (
          <PageNotice message="표시할 제출이 없습니다." status="idle" />
        ) : null}
      </div>
    </ContestPageFrame>
  );
}

export default function ContestSubmissionsPage() {
  return (
    <ContestPageShell>
      {({ contest }) => (
        <ContestSubmissionsContent contestId={contest.contest_id} />
      )}
    </ContestPageShell>
  );
}
