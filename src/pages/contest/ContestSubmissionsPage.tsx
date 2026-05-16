import { useQuery } from '@tanstack/react-query';
import { PageHeading } from '@/components/common/PageLayout';
import ContestPageFrame from '@/components/contest/ContestPageFrame';
import ContestPageShell from '@/components/contest/ContestPageShell';
import ContestSubmissionsTable from '@/components/contest/submissions/ContestSubmissionsTable';
import ContestSubmissionsTabs from '@/components/contest/submissions/ContestSubmissionsTabs';
import { contestQueryKeys } from '@/domains/contestRuntime/queryKeys';
import { useContestParticipantSession } from '@/domains/contestRuntime/useContestParticipantSession';
import {
  getContestProblems,
  getDivisionProblems,
} from '@/domains/problemManagement/api';
import { listSubmissions } from '@/domains/submissionScoreboard/api';
import { isSubmissionPending } from '@/domains/submissionScoreboard/status';
import type { Submission } from '@/domains/submissionScoreboard/types';
import useDocumentVisibility from '@/shared/hooks/useDocumentVisibility';
import PageNotice from '@/shared/ui/PageNotice';

function ContestSubmissionsContent({ contestId }: { contestId: string }) {
  const isDocumentVisible = useDocumentVisibility();
  const {
    activeParticipantSession,
    ensureParticipantSession,
    generalSession,
    participantContest,
  } = useContestParticipantSession(contestId);
  const fallbackTeamName =
    participantContest?.team.team_name ??
    activeParticipantSession?.team.team_name;
  const fallbackMemberName =
    participantContest?.member.name ?? activeParticipantSession?.member.name;

  const problemsQuery = useQuery({
    queryKey: contestQueryKeys.problems(
      contestId,
      generalSession?.accessToken,
      activeParticipantSession?.contestId,
      activeParticipantSession?.division.division_id,
      activeParticipantSession?.accessToken,
    ),
    queryFn: async () => {
      const session = await ensureParticipantSession();
      if (session) {
        return getDivisionProblems(
          contestId,
          session.division.division_id,
          session.accessToken,
        );
      }

      return getContestProblems(contestId, generalSession?.accessToken);
    },
  });

  const submissionsQuery = useQuery({
    queryKey: contestQueryKeys.submissions(
      contestId,
      generalSession?.accessToken,
      activeParticipantSession?.contestId,
      activeParticipantSession?.accessToken,
    ),
    queryFn: async () => {
      const session = await ensureParticipantSession();
      if (session) {
        return listSubmissions(contestId, session.accessToken);
      }

      return listSubmissions(contestId, generalSession?.accessToken);
    },
    refetchInterval: (query) => {
      if (!isDocumentVisible) return false;

      const submissions = (query.state.data ?? []) as Submission[];
      const hasPendingSubmission =
        !query.state.data ||
        submissions.some((submission) =>
          isSubmissionPending(submission.status),
        );

      return hasPendingSubmission ? 3_000 : 15_000;
    },
    refetchIntervalInBackground: false,
  });
  const submissions = submissionsQuery.data ?? [];
  const problems = problemsQuery.data ?? [];

  return (
    <ContestPageFrame>
      <PageHeading
        className="gap-4"
        description="대회 중에는 로그인한 참가팀의 제출만 확인합니다."
        title="채점현황"
        variant="contest"
      />

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
          contestId={contestId}
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
