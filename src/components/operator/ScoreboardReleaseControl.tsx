import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getScoreboardRelease,
  updateScoreboardRelease,
} from '@/domains/submissionScoreboard/api';
import { tokenQueryIdentity } from '@/domains/identityAccess/queryIdentity';
import { formatApiError } from '@/shared/api/errors';

export default function ScoreboardReleaseControl({
  contestId,
  divisionId,
  divisionName,
  token,
}: {
  contestId: string;
  divisionId: string;
  divisionName: string;
  token: string;
}) {
  const client = useQueryClient();
  const queryKey = [
    'operator',
    'scoreboard-release',
    contestId,
    divisionId,
    tokenQueryIdentity(token),
  ];
  const query = useQuery({
    queryKey,
    queryFn: () => getScoreboardRelease(contestId, divisionId, token),
    refetchInterval: 2000,
  });
  const mutation = useMutation({
    mutationFn: (body: { action: 'start' | 'rank' | 'all'; rank?: number }) =>
      updateScoreboardRelease(contestId, divisionId, token, body),
    onSuccess: (data) => {
      client.setQueryData(queryKey, data);
      void client.invalidateQueries({ queryKey: ['operator', 'scoreboard'] });
    },
  });
  const release = query.data;
  const busy = mutation.isPending || !release;
  return (
    <section className="grid gap-4 rounded border border-indigo-200 bg-white p-4 text-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-black">{divisionName} · 종료 후 순위 공개</h3>
        <span className="text-sm font-bold text-indigo-700" role="status">
          {release?.mode === 'not_started'
            ? '공개 방식 선택'
            : release
              ? `${release.revealed_count} / ${release.total_count}팀 공개`
              : '불러오는 중…'}
        </span>
      </div>
      <p className="text-xs leading-5 text-slate-500">
        이 유형에만 적용됩니다. 공개 시작 시 성적을 고정하며 참가자 화면과
        프레젠테이션에 함께 반영됩니다.
      </p>
      <div className="flex flex-wrap gap-2">
        {release?.mode === 'not_started' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => mutation.mutate({ action: 'start' })}
            className="rounded bg-indigo-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            개별 순위 공개 시작
          </button>
        ) : null}
        {release?.mode !== 'all' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(`${divisionName}의 남은 순위를 모두 공개할까요?`)
              )
                mutation.mutate({ action: 'all' });
            }}
            className="rounded border border-indigo-200 px-4 py-3 text-sm font-bold text-indigo-700 disabled:opacity-50"
          >
            이 유형 전체 공개
          </button>
        ) : (
          <p className="text-sm font-bold text-emerald-700">
            모든 순위를 공개했습니다.
          </p>
        )}
      </div>
      {release?.mode === 'partial' ? (
        <>
          <p className="text-sm font-bold">
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
                className={`rounded border px-4 py-3 text-sm font-bold disabled:cursor-not-allowed ${item.revealed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 disabled:opacity-50'}`}
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
