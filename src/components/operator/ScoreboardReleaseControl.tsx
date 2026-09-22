import useConfirmation from '@/shared/ui/useConfirmation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getScoreboardRelease,
  updateScoreboardRelease,
} from '@/domains/submissionScoreboard/api';
import { tokenQueryIdentity } from '@/domains/identityAccess/queryIdentity';
import { notifyScoreboardUpdate } from '@/domains/submissionScoreboard/presentationSync';
import { formatApiError } from '@/shared/api/errors';
import type { ScoreboardReleaseMode } from '@/domains/contestAdministration/types';
import { submissionStatusLabel } from '@/domains/submissionScoreboard/status';
import useDocumentVisibility from '@/shared/hooks/useDocumentVisibility';

export default function ScoreboardReleaseControl({
  contestId,
  divisionId,
  divisionName,
  token,
  strategy = 'manual',
}: {
  contestId: string;
  divisionId: string;
  divisionName: string;
  token: string;
  strategy?: ScoreboardReleaseMode;
}) {
  const { confirm: confirmAction, dialog: confirmationDialog } =
    useConfirmation();

  const client = useQueryClient();
  const isVisible = useDocumentVisibility();
  const queryKey = [
    'operator',
    'scoreboard-release',
    contestId,
    divisionId,
    strategy,
    tokenQueryIdentity(token),
  ];
  const query = useQuery({
    queryKey,
    queryFn: () => getScoreboardRelease(contestId, divisionId, token),
    enabled: strategy !== 'immediate',
    refetchInterval: isVisible && strategy !== 'immediate' ? 2000 : false,
    refetchIntervalInBackground: false,
  });
  const mutation = useMutation({
    mutationFn: (body: {
      action: 'start' | 'rank' | 'all' | 'next';
      rank?: number;
      expected_step?: number;
    }) => updateScoreboardRelease(contestId, divisionId, token, body),
    onSuccess: (data) => {
      client.setQueryData(queryKey, data);
      void client.invalidateQueries({ queryKey: ['operator', 'scoreboard'] });
      void client.invalidateQueries({
        queryKey: ['operator', 'dashboard', contestId],
      });
      notifyScoreboardUpdate(contestId);
    },
    onError: () => {
      // A second operator may have advanced the resolver. Refresh its step
      // before offering another action rather than skipping a result.
      void client.invalidateQueries({ queryKey });
    },
  });
  const release = query.data;
  const busy = mutation.isPending || !release;
  const resolver = release?.resolver;
  const isResolver = (release?.strategy ?? strategy) === 'resolver';
  const lastEvent = resolver?.last_event;

  if (strategy === 'immediate') {
    return (
      <section
        className="mb-4 grid gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
        aria-label="자동 전체 공개 상태"
      >
        <h3 className="font-semibold">{divisionName} · 전체 성적 공개 중</h3>
        <p className="text-sm leading-6">
          대회 종료와 함께 프리즈가 해제되었습니다. 남은 채점과 재채점 결과는
          참가자 스코어보드와 프레젠테이션에 계속 반영됩니다.
        </p>
      </section>
    );
  }
  return (
    <section className="mb-4 grid gap-4 rounded-xl border border-indigo-200 bg-white p-4 text-slate-800">
      {confirmationDialog}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{divisionName} · 종료 후 순위 공개</h3>
        <span className="text-sm font-medium text-indigo-700" role="status">
          {release?.mode === 'not_started'
            ? '발표 준비'
            : isResolver && resolver
              ? `${resolver.step} / ${resolver.total_steps}개 결과 공개`
              : release
                ? `${release.revealed_count} / ${release.total_count}팀 공개`
                : '불러오는 중…'}
        </span>
      </div>
      <p className="text-xs leading-5 text-slate-500">
        {isResolver
          ? '발표를 시작해도 팀명과 프리즈 순위표는 유지됩니다. ‘다음 결과 공개’를 누를 때마다 현재 하위 팀부터 미공개 제출 결과 하나를 반영합니다.'
          : '‘개별 순위 공개 시작’을 누르면 최종 순위 번호만 남고 모든 팀 정보가 가려집니다. 공개할 순위를 선택하면 해당 팀과 성적이 나타납니다.'}{' '}
        공개 시작 시 이 유형의 성적을 고정합니다. 재채점과 검수를 마친 뒤
        시작하세요.
      </p>
      <div className="flex flex-wrap gap-2">
        {release?.mode === 'not_started' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => mutation.mutate({ action: 'start' })}
            className="rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {isResolver ? '결과 순차 공개 시작' : '개별 순위 공개 시작'}
          </button>
        ) : null}
        {isResolver && release?.mode === 'partial' ? (
          <button
            type="button"
            disabled={busy || !resolver || resolver.pending_count === 0}
            onClick={() =>
              mutation.mutate({ action: 'next', expected_step: resolver?.step })
            }
            className="rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {mutation.isPending && mutation.variables?.action === 'next'
              ? '공개 중…'
              : '다음 결과 공개'}
          </button>
        ) : null}
        {release && release.mode !== 'all' ? (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (
                await confirmAction(
                  `${divisionName}의 남은 ${isResolver ? '결과와 순위를' : '순위를'} 모두 공개할까요? 공개 후에는 다시 숨길 수 없습니다.`,
                  {
                    title: '순위 공개 확인',
                    confirmLabel: '공개',
                    tone: 'primary',
                  },
                )
              )
                mutation.mutate({ action: 'all' });
            }}
            className="rounded-lg border border-indigo-200 px-4 py-3 text-sm font-medium text-indigo-700 disabled:opacity-50"
          >
            이 유형 전체 공개
          </button>
        ) : release?.mode === 'all' ? (
          <p className="text-sm font-medium text-emerald-700">
            모든 순위를 공개했습니다.
          </p>
        ) : null}
      </div>
      {isResolver && resolver && release?.mode !== 'not_started' ? (
        <div className="grid gap-3 rounded-lg bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-600">
            <span>
              {release?.revealed_count ?? 0} / {release?.total_count ?? 0}팀
              결과 공개 완료
            </span>
            <span>남은 결과 {resolver.pending_count}개</span>
          </div>
          <progress
            className="h-2 w-full accent-indigo-600"
            aria-label="결과 공개 진행률"
            max={Math.max(1, resolver.total_steps)}
            value={
              release?.mode === 'all'
                ? Math.max(1, resolver.total_steps)
                : resolver.step
            }
          />
          {lastEvent ? (
            <p role="status" className="text-sm leading-6 text-slate-700">
              <strong className="font-semibold text-slate-950">
                {lastEvent.team_name}
              </strong>
              {' · '}
              {lastEvent.problem_code}번{' '}
              {submissionStatusLabel(lastEvent.status)}
              <span className="ml-2 inline-flex rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                {lastEvent.from_rank === lastEvent.to_rank
                  ? `${lastEvent.to_rank}위 유지`
                  : `${lastEvent.from_rank}위 → ${lastEvent.to_rank}위`}
              </span>
            </p>
          ) : release?.mode === 'partial' ? (
            <p className="text-xs leading-5 text-slate-500">
              발표 준비가 끝났습니다. 다음 결과를 공개하면 참가자 화면과
              프레젠테이션의 순위가 함께 갱신됩니다.
            </p>
          ) : null}
        </div>
      ) : null}
      {!isResolver && release?.mode === 'partial' ? (
        <>
          <p className="text-sm font-medium">
            공개할 순위를 선택하세요. 공동 순위는 함께 공개됩니다.
          </p>
          <div className="flex flex-wrap gap-2">
            {[...release.ranks].reverse().map((item) => (
              <button
                key={item.rank}
                type="button"
                disabled={busy || item.revealed}
                onClick={() =>
                  mutation.mutate({ action: 'rank', rank: item.rank })
                }
                className={`rounded-lg border px-4 py-3 text-sm font-medium disabled:cursor-not-allowed ${item.revealed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 disabled:opacity-50'}`}
              >
                {item.rank}위 {item.revealed ? '공개 완료' : '공개'}
                {item.team_count > 1 ? ` · ${item.team_count}팀` : ''}
              </button>
            ))}
          </div>
        </>
      ) : null}
      {query.error || mutation.error ? (
        <p role="alert" className="text-sm text-rose-700">
          {formatApiError(
            query.error || mutation.error,
            '순위 공개 상태를 변경하지 못했습니다.',
          )}
        </p>
      ) : null}
    </section>
  );
}
