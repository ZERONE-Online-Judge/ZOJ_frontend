import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import PageLayout from '@/components/common/PageLayout';
import { sharedUiText } from '@/data/uiText';
import ContestScoreboardTable from '@/components/contest/scoreboard/ContestScoreboardTable';
import {
  OperatorAccessGate,
  OperatorPanel,
  OperatorTabs,
  ScoreboardIcon,
} from '@/components/operator/OperatorShell';
import {
  getOperatorContestDashboard,
  updateContestSettings,
} from '@/domains/contestAdministration/api';
import type { ScoreboardFreezeMode } from '@/domains/contestAdministration/types';
import { tokenQueryIdentity } from '@/domains/identityAccess/queryIdentity';
import { getOperatorProblems } from '@/domains/problemManagement/api';
import { getOperatorDivisionScoreboard } from '@/domains/submissionScoreboard/api';
import { formatApiError } from '@/shared/api/errors';
import useDocumentVisibility from '@/shared/hooks/useDocumentVisibility';

function operatorScoreboardDivisionStorageKey(contestId: string) {
  return `zoj.operator.scoreboard.division.${contestId}`;
}

function readStoredValue(key: string) {
  try {
    return window.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function writeStoredValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures; the in-memory selection still works.
  }
}

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

function ScoreboardFreezeControl({
  disabled,
  error,
  mode,
  onChange,
  publicFrozen,
}: {
  disabled: boolean;
  error: unknown;
  mode: ScoreboardFreezeMode;
  onChange: (mode: ScoreboardFreezeMode) => void;
  publicFrozen: boolean;
}) {
  const effectiveMode: ScoreboardFreezeMode =
    mode === 'auto' ? (publicFrozen ? 'frozen' : 'live') : mode;

  return (
    <section className="grid gap-3 rounded border border-slate-200 bg-white px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-indigo-600 uppercase">
            Public scoreboard
          </p>
          <h2 className="text-base font-black text-slate-950">
            공개 스코어보드 표시
          </h2>
        </div>
        <div className="inline-flex rounded border border-slate-200 bg-slate-100 p-1">
          {[
            ['live', '실시간'],
            ['frozen', '프리즈'],
          ].map(([value, label]) => (
            <button
              className={[
                'h-9 rounded px-5 text-sm font-black transition disabled:cursor-not-allowed',
                effectiveMode === value
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-white hover:text-slate-950',
              ].join(' ')}
              disabled={disabled}
              key={value}
              onClick={() => onChange(value as ScoreboardFreezeMode)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold text-slate-500">
          설정의 프리즈 시각 이후 공개 스코어보드가 멈춥니다.
        </p>
      </div>
      {error ? (
        <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
          {formatApiError(error, '스코어보드 공개 상태를 변경하지 못했습니다')}
        </p>
      ) : null}
    </section>
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
  const queryClient = useQueryClient();
  const queryIdentity = tokenQueryIdentity(token);
  const divisionStorageKey = operatorScoreboardDivisionStorageKey(contestId);
  const [divisionId, setDivisionId] = useState(() =>
    readStoredValue(divisionStorageKey),
  );

  const dashboardQuery = useQuery({
    queryKey: ['operator', 'dashboard', contestId, queryIdentity],
    queryFn: () => getOperatorContestDashboard(contestId, token),
    placeholderData: keepPreviousData,
  });
  const problemsQuery = useQuery({
    queryKey: ['operator', 'problems', contestId, queryIdentity],
    queryFn: () => getOperatorProblems(contestId, token),
    placeholderData: keepPreviousData,
  });
  const scoreboardQuery = useQuery({
    enabled: Boolean(divisionId),
    queryKey: ['operator', 'scoreboard', contestId, divisionId, queryIdentity],
    queryFn: () => getOperatorDivisionScoreboard(contestId, divisionId, token),
    placeholderData: keepPreviousData,
    refetchInterval: isVisible ? 5_000 : false,
    refetchIntervalInBackground: false,
  });
  const freezeModeMutation = useMutation({
    mutationFn: (mode: ScoreboardFreezeMode) =>
      updateContestSettings(contestId, token, {
        scoreboard_freeze_mode: mode,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['operator', 'dashboard', contestId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['operator', 'scoreboard', contestId],
      });
    },
  });

  const divisions = dashboardQuery.data?.divisions ?? [];
  const contest = dashboardQuery.data?.contest;
  const freezeMode = contest?.scoreboard_freeze_mode ?? 'auto';
  const problems = (problemsQuery.data ?? []).filter((problem) =>
    divisionId ? problem.division_id === divisionId : true,
  );

  const rows = scoreboardQuery.data?.rows ?? [];

  useEffect(() => {
    if (!divisions.length) {
      setDivisionId('');
      return;
    }
    if (
      !divisionId ||
      !divisions.some((division) => division.division_id === divisionId)
    ) {
      const nextDivisionId = divisions[0].division_id;
      setDivisionId(nextDivisionId);
      writeStoredValue(divisionStorageKey, nextDivisionId);
    }
  }, [divisionId, divisionStorageKey, divisions]);

  return (
    <PageLayout
      description="운영자용 내부 순위입니다. 프리즈 이후에도 live view를 확인할 수 있습니다."
      eyebrow="Operator"
      title={`${dashboardQuery.data?.contest.title ?? '대회'} 스코어보드`}
      width="full"
    >
      <OperatorTabs contestId={contestId} />

      <ScoreboardFreezeControl
        disabled={freezeModeMutation.isPending}
        error={freezeModeMutation.error}
        mode={freezeMode}
        onChange={(mode) => freezeModeMutation.mutate(mode)}
        publicFrozen={Boolean(scoreboardQuery.data?.frozen_public_view)}
      />

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
              onChange={(event) => {
                setDivisionId(event.target.value);
                writeStoredValue(divisionStorageKey, event.target.value);
              }}
              value={divisionId}
            >
              {divisions.map((division) => (
                <option key={division.division_id} value={division.division_id}>
                  {division.name}
                </option>
              ))}
            </select>
          </label>
        }
        description="유형별 스코어보드를 확인합니다."
        title="순위표"
      >
        {scoreboardQuery.data?.frozen_public_view ? (
          <p className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
            공개 스코어보드는 프리즈 상태입니다. 이 화면은 운영자 live
            view입니다.
          </p>
        ) : null}
        <ContestScoreboardTable problems={problems} rows={rows} />
        {!scoreboardQuery.isLoading && rows.length === 0 ? (
          <p className="mt-4 rounded border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-bold text-slate-500">
            표시할 스코어보드가 없습니다.
          </p>
        ) : null}
      </OperatorPanel>
    </PageLayout>
  );
}
