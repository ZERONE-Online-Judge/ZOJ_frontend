import { useQuery } from '@tanstack/react-query';
import PageLayout from '@/components/common/PageLayout';
import { publicPageText } from '@/data/uiText';
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
      description={publicPageText.judgeStatus.description}
      eyebrow={publicPageText.judgeStatus.eyebrow}
      title={publicPageText.judgeStatus.title}
    >
      {statusQuery.isLoading && !status ? (
        <PageNotice
          message={publicPageText.judgeStatus.loading}
          status="loading"
        />
      ) : null}
      {statusQuery.isError && !status ? (
        <PageNotice
          message={publicPageText.judgeStatus.loadError}
          status="error"
        />
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-md border border-slate-200 bg-white p-5">
          <span className="text-sm font-semibold text-slate-500">
            {publicPageText.judgeStatus.activeNodes}
          </span>
          <strong className="mt-3 block font-mono text-3xl font-black text-slate-950 tabular-nums">
            <AnimatedNumber value={status?.active_node_count} />
          </strong>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-5">
          <span className="text-sm font-semibold text-slate-500">
            {publicPageText.judgeStatus.runningJobs}
          </span>
          <strong className="mt-3 block font-mono text-3xl font-black text-slate-950 tabular-nums">
            <AnimatedNumber value={status?.total_running_jobs} />
          </strong>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-5">
          <span className="text-sm font-semibold text-slate-500">
            {publicPageText.judgeStatus.queueDepth}
          </span>
          <strong className="mt-3 block font-mono text-3xl font-black text-slate-950 tabular-nums">
            <AnimatedNumber value={status?.total_queue_depth} />
          </strong>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-5">
          <span className="text-sm font-semibold text-slate-500">
            {publicPageText.judgeStatus.allocationPolicy}
          </span>
          <strong className="mt-3 block text-xl font-black text-slate-950">
            {policyLabel(status?.allocation_policy)}
          </strong>
        </article>
      </section>

      <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
        <span>{publicPageText.judgeStatus.refreshNotice}</span>
        <time>
          {publicPageText.judgeStatus.lastUpdated}:{' '}
          {lastUpdatedAt
            ? lastUpdatedAt.toLocaleTimeString('ko-KR', { hour12: false })
            : '-'}
        </time>
      </div>
    </PageLayout>
  );
}
