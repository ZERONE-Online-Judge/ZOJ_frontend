import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PageLayout from '@/components/common/PageLayout';
import { sharedUiText } from '@/data/uiText';
import ContestScoreboardTable from '@/components/contest/scoreboard/ContestScoreboardTable';
import {
  OperatorAccessGate,
  OperatorPanel,
  OperatorTabs,
  ScoreboardIcon,
} from '@/components/operator/OperatorShell';
import { getOperatorContestDashboard } from '@/domains/contestAdministration/api';
import { getOperatorProblems } from '@/domains/problemManagement/api';
import {
  getOperatorDivisionScoreboard,
  getOperatorScoreboard,
} from '@/domains/submissionScoreboard/api';
import { formatApiError } from '@/shared/api/errors';
import useDocumentVisibility from '@/shared/hooks/useDocumentVisibility';

export default function OperatorScoreboardPage() {
  const { contestId } = useParams();

  return (
    <OperatorAccessGate
      contestId={contestId}
      permission="contest.scoreboard.view"
    >
      {(session) =>
        contestId ? (
          <OperatorScoreboardContent
            contestId={contestId}
            token={session.accessToken}
          />
        ) : (
          <PageLayout title={sharedUiText.contestSelectionRequiredTitle}>
            {sharedUiText.contestSelectionRequiredBody}
          </PageLayout>
        )
      }
    </OperatorAccessGate>
  );
}

function OperatorScoreboardContent({
  contestId,
  token,
}: {
  contestId: string;
  token: string;
}) {
  const isVisible = useDocumentVisibility();
  const [divisionId, setDivisionId] = useState('all');

  const dashboardQuery = useQuery({
    queryKey: ['operator', 'dashboard', contestId],
    queryFn: () => getOperatorContestDashboard(contestId, token),
  });
  const problemsQuery = useQuery({
    queryKey: ['operator', 'problems', contestId],
    queryFn: () => getOperatorProblems(contestId, token),
  });
  const scoreboardQuery = useQuery({
    queryKey: ['operator', 'scoreboard', contestId, divisionId],
    queryFn: () =>
      divisionId === 'all'
        ? getOperatorScoreboard(contestId, token)
        : getOperatorDivisionScoreboard(contestId, divisionId, token),
    refetchInterval: isVisible ? 1_000 : false,
    refetchIntervalInBackground: false,
  });

  const rows = scoreboardQuery.data?.rows ?? [];

  return (
    <PageLayout
      description="운영자용 내부 순위입니다. 프리즈 이후에도 live view를 확인할 수 있습니다."
      eyebrow="Operator"
      title={`${dashboardQuery.data?.contest.title ?? '대회'} 스코어보드`}
      width="7xl"
    >
      <OperatorTabs contestId={contestId} />

      {dashboardQuery.error || problemsQuery.error || scoreboardQuery.error ? (
        <div className="rounded border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
          {formatApiError(
            dashboardQuery.error ||
              problemsQuery.error ||
              scoreboardQuery.error,
            '스코어보드를 불러오지 못했습니다',
          )}
        </div>
      ) : null}

      <OperatorPanel
        actions={
          <label className="inline-flex items-center gap-2 text-sm font-black text-slate-700">
            <ScoreboardIcon />
            <select
              className="h-10 rounded border border-slate-200 px-3 text-sm font-bold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              onChange={(event) => setDivisionId(event.target.value)}
              value={divisionId}
            >
              <option value="all">전체 유형</option>
              {(dashboardQuery.data?.divisions ?? []).map((division) => (
                <option key={division.division_id} value={division.division_id}>
                  {division.name}
                </option>
              ))}
            </select>
          </label>
        }
        description="유형별 또는 전체 스코어보드를 확인합니다."
        title="순위표"
      >
        {scoreboardQuery.data?.frozen_public_view ? (
          <p className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
            공개 스코어보드는 프리즈 상태입니다. 이 화면은 운영자 live
            view입니다.
          </p>
        ) : null}
        <ContestScoreboardTable
          problems={problemsQuery.data ?? []}
          rows={rows}
        />
        {!scoreboardQuery.isLoading && rows.length === 0 ? (
          <p className="mt-4 rounded border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-bold text-slate-500">
            표시할 스코어보드가 없습니다.
          </p>
        ) : null}
      </OperatorPanel>
    </PageLayout>
  );
}
