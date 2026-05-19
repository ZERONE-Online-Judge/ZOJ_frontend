import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeading } from '@/components/common/PageLayout';
import ContestPageFrame from '@/components/contest/ContestPageFrame';
import ContestPageShell from '@/components/contest/ContestPageShell';
import ContestScoreboardTable from '@/components/contest/scoreboard/ContestScoreboardTable';
import ContestScoreboardTabs from '@/components/contest/scoreboard/ContestScoreboardTabs';
import {
  canViewContestResource,
  contestAccessPhase,
  contestResourceAccessMessage,
  contestResourceAccess,
} from '@/domains/contestAdministration/logic';
import type { Contest, Division } from '@/domains/contestAdministration/types';
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
  divisions,
}: {
  contest: Contest;
  contestId: string;
  divisions: Division[];
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
  const scoreboardAccess = contestResourceAccess(contest, 'scoreboard');
  const problemAccess = contestResourceAccess(contest, 'problem');
  const isEnded = contestAccessPhase(contest) === 'ended';
  const [publicDivisionId, setPublicDivisionId] = useState('');
  const selectedPublicDivisionId =
    publicDivisionId || divisions[0]?.division_id || '';
  const shouldShowDivisionSelect = !hasSessionAccess && divisions.length > 1;
  const shouldUseParticipantScope =
    hasSessionAccess &&
    (!isEnded ||
      scoreboardAccess === 'participants' ||
      problemAccess === 'participants');
  const effectiveDivisionId = shouldUseParticipantScope
    ? activeParticipantSession?.division.division_id
    : selectedPublicDivisionId;
  const canViewScoreboard = canViewContestResource(
    contest,
    hasSessionAccess,
    scoreboardAccess,
  );
  const canViewProblems = canViewContestResource(
    contest,
    hasSessionAccess,
    problemAccess,
  );

  useEffect(() => {
    if (
      publicDivisionId &&
      !divisions.some((division) => division.division_id === publicDivisionId)
    ) {
      setPublicDivisionId('');
    }
  }, [divisions, publicDivisionId]);

  const problemsQuery = useQuery({
    enabled: canViewScoreboard && canViewProblems,
    queryKey: contestQueryKeys.problems(
      contestId,
      generalSession?.accessToken,
      shouldUseParticipantScope
        ? activeParticipantSession?.contestId
        : undefined,
      shouldUseParticipantScope
        ? activeParticipantSession?.division.division_id
        : effectiveDivisionId,
      shouldUseParticipantScope
        ? activeParticipantSession?.accessToken
        : undefined,
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
      if (effectiveDivisionId) {
        return getDivisionProblems(
          contestId,
          effectiveDivisionId,
          generalSession?.accessToken,
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
      shouldUseParticipantScope
        ? activeParticipantSession?.contestId
        : undefined,
      shouldUseParticipantScope
        ? activeParticipantSession?.division.division_id
        : effectiveDivisionId,
      shouldUseParticipantScope
        ? activeParticipantSession?.accessToken
        : undefined,
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
      if (effectiveDivisionId) {
        return getDivisionScoreboard(
          contestId,
          effectiveDivisionId,
          generalSession?.accessToken,
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

      {shouldShowDivisionSelect ? (
        <DivisionSelect
          divisions={divisions}
          onChange={setPublicDivisionId}
          value={selectedPublicDivisionId}
        />
      ) : null}

      <div className="mt-9">
        {!canViewScoreboard ? (
          <PageNotice
            message={contestResourceAccessMessage(
              contest,
              'scoreboard',
              hasSessionAccess,
            )}
            status="idle"
          />
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

        {canViewScoreboard &&
        !scoreboardQuery.isLoading &&
        rows.length === 0 ? (
          <PageNotice message="표시할 스코어보드가 없습니다." status="idle" />
        ) : null}
      </div>
    </ContestPageFrame>
  );
}

export default function ContestScoreboardPage() {
  return (
    <ContestPageShell>
      {({ contest, divisions }) => (
        <ContestScoreboardContent
          contest={contest}
          contestId={contest.contest_id}
          divisions={divisions}
        />
      )}
    </ContestPageShell>
  );
}

function DivisionSelect({
  divisions,
  onChange,
  value,
}: {
  divisions: Division[];
  onChange: (divisionId: string) => void;
  value: string;
}) {
  return (
    <label className="mt-5 inline-grid gap-2 text-sm font-black text-slate-700">
      유형 선택
      <select
        className="h-10 rounded border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 transition outline-none focus:border-slate-400"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {divisions.map((division) => (
          <option key={division.division_id} value={division.division_id}>
            {division.name}
          </option>
        ))}
      </select>
    </label>
  );
}
