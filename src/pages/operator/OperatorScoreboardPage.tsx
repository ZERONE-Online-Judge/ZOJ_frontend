import { useEffect, useMemo, useState } from 'react';
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
import type { Problem } from '@/domains/problemManagement/types';
import { getOperatorDivisionScoreboard } from '@/domains/submissionScoreboard/api';
import type {
  ScoreboardProblemScore,
  ScoreboardRow,
} from '@/domains/submissionScoreboard/types';
import { formatApiError } from '@/shared/api/errors';
import { formatDateTime } from '@/shared/lib/dateTime';
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

function openPresentationPopup(contestId: string) {
  const url = `/operator/contests/${contestId}/scoreboard/presentation`;
  const popup = window.open(
    url,
    `zoj-scoreboard-presentation-${contestId}`,
    'popup=yes,width=1600,height=1000,menubar=no,toolbar=no,location=no,status=no',
  );

  if (!popup) {
    window.location.assign(url);
    return;
  }
  popup.focus();
}

function freezeRemainingLabel(freezeAt?: string | null) {
  if (!freezeAt) return '-';

  const diffMs = new Date(freezeAt).getTime() - Date.now();
  if (diffMs <= 0) return '프리즈 시각이 지났습니다';

  const totalMinutes = Math.ceil(diffMs / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}일 ${hours}시간 ${minutes}분 남음`;
  if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
  return `${minutes}분 남음`;
}

function formatPenalty(value?: number | null) {
  if (value === undefined || value === null) return '-';
  return value.toLocaleString('ko-KR');
}

function problemLabel(
  score: ScoreboardProblemScore,
  problemById: Map<string, Problem>,
) {
  const problem = score.problem_id ? problemById.get(score.problem_id) : null;
  if (!problem) return score.problem_code;
  return `${problem.problem_code}. ${problem.title}`;
}

function elapsedMinutes(
  score: ScoreboardProblemScore,
  contestStartAt?: string | null,
) {
  if (contestStartAt && score.solved_at) {
    const diff = new Date(score.solved_at).getTime() - new Date(contestStartAt).getTime();
    if (Number.isFinite(diff)) return Math.max(0, Math.floor(diff / 60_000));
  }

  if (score.penalty === undefined || score.penalty === null) return null;
  return Math.max(0, score.penalty - score.wrong_attempts * 20);
}

function PenaltyBreakdownModal({
  contestStartAt,
  onClose,
  problemById,
  row,
}: {
  contestStartAt?: string | null;
  onClose: () => void;
  problemById: Map<string, Problem>;
  row: ScoreboardRow;
}) {
  const solvedScores = row.problem_scores.filter((score) => score.solved);
  const unsolvedAttemptCount = row.problem_scores
    .filter((score) => !score.solved)
    .reduce((sum, score) => sum + score.attempts, 0);

  return (
    <div aria-modal="true" className="zoj-modal-backdrop" role="dialog">
      <section className="zoj-modal-shell grid max-w-4xl grid-rows-[auto_minmax(0,1fr)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-black text-indigo-600 uppercase">
              Penalty breakdown
            </p>
            <h2 className="zoj-break-anywhere text-xl font-black text-slate-950">
              {row.team_name} · 총시간 {formatPenalty(row.penalty)}
            </h2>
          </div>
          <button
            className="h-10 rounded border border-slate-200 px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            닫기
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto p-5">
          <div className="grid gap-4">
            <div className="grid gap-3 rounded border border-indigo-100 bg-indigo-50 px-4 py-4 text-sm font-bold text-indigo-900">
              <p>
                총시간은 스코어보드 응답의 <code>row.penalty</code> 값입니다.
                문제별로 <code>problem_scores[].penalty</code>가 더해집니다.
              </p>
              <p className="text-indigo-700">
                문제별 계산: 정답 제출까지 걸린 분 + 정답 전 실패 횟수 × 20분
              </p>
            </div>

            {solvedScores.length ? (
              <div className="overflow-x-auto rounded border border-slate-200 bg-white">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-black text-slate-500">
                    <tr>
                      <th className="border-r border-slate-200 px-4 py-3">문제</th>
                      <th className="border-r border-slate-200 px-4 py-3">정답 시각</th>
                      <th className="border-r border-slate-200 px-4 py-3 text-right">기본 시간</th>
                      <th className="border-r border-slate-200 px-4 py-3 text-right">실패</th>
                      <th className="px-4 py-3 text-right">문제별 패널티</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {solvedScores.map((score) => {
                      const elapsed = elapsedMinutes(score, contestStartAt);
                      const wrongPenalty = score.wrong_attempts * 20;
                      return (
                        <tr key={score.problem_id ?? score.problem_code}>
                          <td className="border-r border-slate-100 px-4 py-3 font-black text-slate-950">
                            {problemLabel(score, problemById)}
                          </td>
                          <td className="border-r border-slate-100 px-4 py-3 font-bold text-slate-500">
                            {formatDateTime(score.solved_at ?? undefined)}
                          </td>
                          <td className="border-r border-slate-100 px-4 py-3 text-right font-bold text-slate-700">
                            {elapsed === null ? '-' : `${elapsed.toLocaleString('ko-KR')}분`}
                          </td>
                          <td className="border-r border-slate-100 px-4 py-3 text-right font-bold text-slate-700">
                            {score.wrong_attempts.toLocaleString('ko-KR')}회 × 20 =
                            {' '}
                            {wrongPenalty.toLocaleString('ko-KR')}분
                          </td>
                          <td className="px-4 py-3 text-right font-black text-indigo-700">
                            {formatPenalty(score.penalty)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-bold text-slate-500">
                해결한 문제가 없어 총시간은 0입니다.
              </p>
            )}

            <div className="grid gap-2 rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
              <p>
                합계: {solvedScores.length}개 해결, 총시간 {formatPenalty(row.penalty)}
              </p>
              <p>
                미해결 문제의 실패 시도 {unsolvedAttemptCount.toLocaleString('ko-KR')}회는
                총시간에 더하지 않고, 동점 정렬용 시도 수로만 사용됩니다.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
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
  freezeAt,
  mode,
  onChange,
  publicFrozen,
}: {
  disabled: boolean;
  error: unknown;
  freezeAt?: string | null;
  mode: ScoreboardFreezeMode;
  onChange: (mode: ScoreboardFreezeMode) => void;
  publicFrozen: boolean;
}) {
  const options: {
    description: string;
    label: string;
    value: ScoreboardFreezeMode;
  }[] = [
    {
      description: '프리즈 시간이 지나면 공개 스코어보드를 자동으로 멈춤',
      label: '오토',
      value: 'auto',
    },
    {
      description: '프리즈 시간 이후에도 공개 스코어보드를 실시간 유지',
      label: '라이브',
      value: 'live',
    },
    {
      description: '지금 기준으로 공개 스코어보드를 프리즈 상태로 유지',
      label: '프리즈',
      value: 'frozen',
    },
  ];

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
        <div className="grid gap-1 rounded border border-slate-200 bg-slate-100 p-1 sm:inline-grid sm:grid-cols-3">
          {options.map((option) => (
            <button
              className={[
                'h-10 rounded px-5 text-sm font-black transition disabled:cursor-not-allowed',
                mode === option.value
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-white hover:text-slate-950',
              ].join(' ')}
              disabled={disabled}
              key={option.value}
              onClick={() => onChange(option.value)}
              type="button"
              title={option.description}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold text-slate-500">
          기본 운용은 프리즈 시간 자동 적용입니다. 라이브와 프리즈는 수동
          유지 모드입니다.
        </p>
        <span
          className={[
            'rounded-full border px-3 py-1 text-xs font-black',
            publicFrozen
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700',
          ].join(' ')}
        >
          공개 화면: {publicFrozen ? '프리즈 적용 중' : '라이브'}
        </span>
      </div>
      <div className="grid gap-2 rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-xs font-black text-slate-500">프리즈 기준 시각</p>
          <p className="mt-1 font-black text-slate-950">
            {formatDateTime(freezeAt ?? undefined)}
          </p>
        </div>
        <p className="rounded-full border border-indigo-100 bg-white px-3 py-1 text-xs font-black text-indigo-700">
          {freezeRemainingLabel(freezeAt)}
        </p>
      </div>
      {mode !== 'auto' ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
          현재 공개 스코어보드가 오토가 아닙니다. 프리즈 시각 기준으로
          자동 전환하려면 오토로 변경해 주세요.
        </p>
      ) : null}
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
  const [selectedPenaltyRow, setSelectedPenaltyRow] =
    useState<ScoreboardRow | null>(null);

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
  const problemById = useMemo(
    () =>
      new Map(
        problems.map((problem) => [problem.problem_id, problem]),
      ),
    [problems],
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
        freezeAt={contest?.freeze_at}
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
          <>
            <button
              className="zoj-pressable inline-flex h-10 items-center gap-2 rounded border border-indigo-200 bg-indigo-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700"
              onClick={() => openPresentationPopup(contestId)}
              type="button"
            >
              <ScoreboardIcon />
              프레젠테이션 팝업
            </button>
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
                  <option
                    key={division.division_id}
                    value={division.division_id}
                  >
                    {division.name}
                  </option>
                ))}
              </select>
            </label>
          </>
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
        <ContestScoreboardTable
          onSelectPenaltyBreakdown={setSelectedPenaltyRow}
          problems={problems}
          rows={rows}
        />
        {!scoreboardQuery.isLoading && rows.length === 0 ? (
          <p className="mt-4 rounded border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-bold text-slate-500">
            표시할 스코어보드가 없습니다.
          </p>
        ) : null}
      </OperatorPanel>
      {selectedPenaltyRow ? (
        <PenaltyBreakdownModal
          contestStartAt={contest?.start_at}
          onClose={() => setSelectedPenaltyRow(null)}
          problemById={problemById}
          row={selectedPenaltyRow}
        />
      ) : null}
    </PageLayout>
  );
}
