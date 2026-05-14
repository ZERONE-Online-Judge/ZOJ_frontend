import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPublicJudgeStatus } from '@/domains/auditMonitoring/api';
import PageNotice from '@/shared/ui/PageNotice';

const NUMBER_ANIMATION_DURATION_MS = 450;

function policyLabel(policy?: string) {
  if (!policy) return '-';

  const labels: Record<string, string> = {
    round_robin: 'Round Robin',
    least_loaded: 'Least Loaded',
    fifo: 'FIFO',
  };

  return labels[policy] ?? policy;
}

function AnimatedNumber({ value }: { value?: number }) {
  const [displayValue, setDisplayValue] = useState<number | null>(value ?? null);
  const displayValueRef = useRef(value ?? 0);

  useEffect(() => {
    if (value === undefined) return;

    const targetValue = value;
    const startValue = displayValueRef.current;
    const difference = targetValue - startValue;
    if (difference === 0) return;

    let frameId = 0;

    function tick(timestamp: number, startedAt = timestamp) {
      const progress = Math.min((timestamp - startedAt) / NUMBER_ANIMATION_DURATION_MS, 1);
      const easedProgress = 1 - (1 - progress) ** 3;
      const nextValue = Math.round(startValue + difference * easedProgress);

      displayValueRef.current = nextValue;
      setDisplayValue(nextValue);

      if (progress < 1) {
        frameId = window.requestAnimationFrame((nextTimestamp) => tick(nextTimestamp, startedAt));
      } else {
        displayValueRef.current = targetValue;
        setDisplayValue(targetValue);
      }
    }

    frameId = window.requestAnimationFrame((timestamp) => tick(timestamp));

    return () => window.cancelAnimationFrame(frameId);
  }, [value]);

  if (value === undefined || displayValue === null) return '-';

  return displayValue.toLocaleString('ko-KR');
}

export default function JudgeStatusPage() {
  const statusQuery = useQuery({
    queryKey: ['public-judge-status'],
    queryFn: getPublicJudgeStatus,
    refetchInterval: 5_000,
  });

  const status = statusQuery.data;
  const lastUpdatedAt = statusQuery.dataUpdatedAt ? new Date(statusQuery.dataUpdatedAt) : null;

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-8 px-6 py-14 font-sans lg:px-8">
      <header className="grid gap-2">
        <span className="text-sm font-bold text-zoj-blue">Judge Status</span>
        <h1 className="text-3xl font-black tracking-normal text-slate-950">채점 상태</h1>
        <p className="text-base leading-7 text-slate-600">
          공개 채점 서버 상태를 주기적으로 갱신해 표시합니다.
        </p>
      </header>

      {statusQuery.isLoading && <PageNotice message="채점 상태를 불러오는 중입니다." status="loading" />}
      {statusQuery.isError && <PageNotice message="채점 상태를 불러오지 못했습니다." status="error" />}

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-md border border-slate-200 bg-white p-5">
          <span className="text-sm font-semibold text-slate-500">활성 노드</span>
          <strong className="mt-3 block font-mono text-3xl font-black text-slate-950 tabular-nums">
            <AnimatedNumber value={status?.active_node_count} />
          </strong>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-5">
          <span className="text-sm font-semibold text-slate-500">실행 중 작업</span>
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
          <span className="text-sm font-semibold text-slate-500">할당 정책</span>
          <strong className="mt-3 block text-xl font-black text-slate-950">
            {policyLabel(status?.allocation_policy)}
          </strong>
        </article>
      </section>

      <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
        <span>{statusQuery.isFetching ? '갱신 중입니다.' : '5초마다 상태를 갱신합니다.'}</span>
        <time>
          마지막 갱신: {lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString('ko-KR', { hour12: false }) : '-'}
        </time>
      </div>
    </section>
  );
}
