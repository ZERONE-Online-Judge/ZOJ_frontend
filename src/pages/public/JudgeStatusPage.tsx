import { useQuery } from '@tanstack/react-query';
import PageLayout from '@/components/common/PageLayout';
import { getPublicJudgeStatus } from '@/domains/auditMonitoring/api';
import useDocumentVisibility from '@/shared/hooks/useDocumentVisibility';
import AnimatedNumber from '@/shared/ui/AnimatedNumber';
import PageNotice from '@/shared/ui/PageNotice';

function policyLabel(policy?: string) {
  if (!policy) return '-';

  const labels: Record<string, string> = {
    round_robin: 'Round Robin',
    least_loaded: 'Least Loaded',
    fifo: 'FIFO',
  };

  return labels[policy] ?? policy;
}

export default function JudgeStatusPage() {
  const isDocumentVisible = useDocumentVisibility();
  const statusQuery = useQuery({
    queryKey: ['public-judge-status'],
    queryFn: getPublicJudgeStatus,
    refetchInterval: isDocumentVisible ? 5_000 : false,
    refetchIntervalInBackground: false,
  });

  const status = statusQuery.data;
  const lastUpdatedAt = statusQuery.dataUpdatedAt
    ? new Date(statusQuery.dataUpdatedAt)
    : null;

  return (
    <PageLayout
      description="공개 채점 서버 상태를 주기적으로 갱신해 표시합니다."
      eyebrow="Judge Status"
      title="채점 상태"
    >
      {statusQuery.isLoading && !status ? (
        <PageNotice message="채점 상태를 불러오는 중입니다." status="loading" />
      ) : null}
      {statusQuery.isError && !status ? (
        <PageNotice message="채점 상태를 불러오지 못했습니다." status="error" />
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-md border border-slate-200 bg-white p-5">
          <span className="text-sm font-semibold text-slate-500">
            활성 노드
          </span>
          <strong className="mt-3 block font-mono text-3xl font-black text-slate-950 tabular-nums">
            <AnimatedNumber value={status?.active_node_count} />
          </strong>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-5">
          <span className="text-sm font-semibold text-slate-500">
            실행 중 작업
          </span>
          <strong className="mt-3 block font-mono text-3xl font-black text-slate-950 tabular-nums">
            <AnimatedNumber value={status?.total_running_jobs} />
          </strong>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-5">
          <span className="text-sm font-semibold text-slate-500">대기열</span>
          <strong className="mt-3 block font-mono text-3xl font-black text-slate-950 tabular-nums">
            <AnimatedNumber value={status?.total_queue_depth} />
          </strong>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-5">
          <span className="text-sm font-semibold text-slate-500">
            할당 정책
          </span>
          <strong className="mt-3 block text-xl font-black text-slate-950">
            {policyLabel(status?.allocation_policy)}
          </strong>
        </article>
      </section>

      <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
        <span>5초마다 상태를 갱신합니다.</span>
        <time>
          마지막 갱신:{' '}
          {lastUpdatedAt
            ? lastUpdatedAt.toLocaleTimeString('ko-KR', { hour12: false })
            : '-'}
        </time>
      </div>
    </PageLayout>
  );
}
