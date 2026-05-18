import { useQuery } from '@tanstack/react-query';
import { PageHeading } from '@/components/common/PageLayout';
import ContestPageFrame from '@/components/contest/ContestPageFrame';
import ContestPageShell from '@/components/contest/ContestPageShell';
import ContestScoreboardTable from '@/components/contest/scoreboard/ContestScoreboardTable';
import ContestScoreboardTabs from '@/components/contest/scoreboard/ContestScoreboardTabs';
import { canViewContestResource } from '@/domains/contestAdministration/logic';
import type { Contest } from '@/domains/contestAdministration/types';
import { contestQueryKeys } from '@/domains/contestRuntime/queryKeys';
import { useContestParticipantSession } from '@/domains/contestRuntime/useContestParticipantSession';
import {
  getContestProblems,
  getDivisionProblems,
} from '@/domains/problemManagement/api';
import {
  getDivisionScoreboard,
  getScoreboard,
} from '@/domains/submissionScoreboard/api';
import useDocumentVisibility from '@/shared/hooks/useDocumentVisibility';
import PageNotice from '@/shared/ui/PageNotice';

function ContestScoreboardContent({
  contest,
  contestId,
}: {
  contest: Contest;
  contestId: string;
}) {
  const isDocumentVisible = useDocumentVisibility();
  const {
    activeParticipantSession,
    ensureParticipantSession,
    generalSession,
    participantContest,
  } = useContestParticipantSession(contestId);
  const divisionName =
    participantContest?.division.name ??
    activeParticipantSession?.division.name;
  const hasSessionAccess = Boolean(participantContest);
  const canViewScoreboard = canViewContestResource(
    contest,
    hasSessionAccess,
    contest.scoreboard_public_after_end,
  );
  const canViewProblems = canViewContestResource(
    contest,
    hasSessionAccess,
    contest.problem_public_after_end,
  );

  const problemsQuery = useQuery({
    enabled: canViewScoreboard && canViewProblems,
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

  const scoreboardQuery = useQuery({
    enabled: canViewScoreboard,
    queryKey: contestQueryKeys.scoreboard(
      contestId,
      generalSession?.accessToken,
      activeParticipantSession?.contestId,
      activeParticipantSession?.division.division_id,
      activeParticipantSession?.accessToken,
    ),
    queryFn: async () => {
      const session = await ensureParticipantSession();
      if (session) {
        return getDivisionScoreboard(
          contestId,
          session.division.division_id,
          session.accessToken,
        );
      }

      return getScoreboard(contestId, generalSession?.accessToken);
    },
    refetchInterval: isDocumentVisible ? 5_000 : false,
    refetchIntervalInBackground: false,
  });
  const rows = scoreboardQuery.data?.rows ?? [];
  const problems = problemsQuery.data ?? [];
  const resolvedDivisionName =
    scoreboardQuery.data?.division.name ?? divisionName;

  return (
    <ContestPageFrame>
      <PageHeading
        className="gap-4"
        description={
          resolvedDivisionName
            ? `${resolvedDivisionName} 기준 순위입니다.`
            : '유형 없음 유형 기준 순위입니다.'
        }
        title="스코어보드"
        variant="contest"
      />

      <ContestScoreboardTabs contestId={contestId} />

      <div className="mt-9">
        {!canViewScoreboard ? (
          <PageNotice message="스코어보드를 볼 수 없습니다." status="idle" />
        ) : null}
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

        {canViewScoreboard ? (
          <ContestScoreboardTable problems={problems} rows={rows} />
        ) : null}

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
        <ContestScoreboardContent
          contest={contest}
          contestId={contest.contest_id}
        />
      )}
    </ContestPageShell>
  );
}
