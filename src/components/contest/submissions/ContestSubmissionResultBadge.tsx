import { useEffect, useMemo, useState } from 'react';
import {
  isSubmissionPending,
  submissionProgressPercent,
  submissionStatusLabel,
  submissionStatusTone,
} from '@/domains/submissionScoreboard/status';
import type { SubmissionProgressState } from '@/domains/submissionScoreboard/types';

type ContestSubmissionResultBadgeProps = {
  judgeMessage?: string | null;
  submission?: SubmissionProgressState;
  status: string;
};

const toneClassNames = {
  success: 'text-emerald-600 no-underline',
  waiting: 'text-yellow-700 underline decoration-current',
  judging: 'text-orange-700 underline decoration-current',
  runtime: 'text-purple-700 no-underline',
  danger: 'text-red-500 no-underline',
  neutral: 'text-slate-950 underline decoration-current',
} as const;

function progressTarget(
  submission: SubmissionProgressState | undefined,
  status: string,
) {
  if (status !== 'judging') return null;

  const percent = submissionProgressPercent(submission ?? { status });
  if (percent !== null) return percent;

  return 0;
}

export default function ContestSubmissionResultBadge({
  judgeMessage,
  submission,
  status,
}: ContestSubmissionResultBadgeProps) {
  const tone = submissionStatusTone(status);
  const label = submissionStatusLabel(status);
  const detail = judgeMessage?.trim();
  const targetProgress = useMemo(
    () => progressTarget(submission, status),
    [status, submission?.progress_current, submission?.progress_total],
  );
  const [displayProgress, setDisplayProgress] = useState(0);
  const visibleProgress =
    status === 'judging' && targetProgress !== null
      ? Math.max(0, Math.min(99, Math.round(displayProgress)))
      : null;
  const displayLabel =
    isSubmissionPending(status) && visibleProgress !== null
      ? `${label} - ${visibleProgress}%`
      : label;

  useEffect(() => {
    if (targetProgress === null) {
      setDisplayProgress(0);
      return;
    }

    setDisplayProgress((previous) => Math.min(previous, targetProgress));
    const interval = window.setInterval(() => {
      setDisplayProgress((previous) => {
        const diff = targetProgress - previous;
        if (Math.abs(diff) < 0.4) {
          if (status === 'judging' && targetProgress < 95) {
            return Math.min(95, previous + 0.08);
          }

          return targetProgress;
        }

        const step = Math.max(0.35, Math.abs(diff) * 0.16);
        return previous + Math.sign(diff) * step;
      });
    }, 80);

    return () => window.clearInterval(interval);
  }, [status, targetProgress]);

  return (
    <span className="inline-flex min-w-0 flex-col gap-1">
      <span
        className={[
          'font-black decoration-1 underline-offset-2',
          toneClassNames[tone],
        ].join(' ')}
      >
        {detail ? `${displayLabel}(${detail})` : displayLabel}
      </span>
      {visibleProgress !== null ? (
        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-orange-100">
          <span
            className="block h-full rounded-full bg-orange-500 transition-[width] duration-200 ease-out"
            style={{ width: `${visibleProgress}%` }}
          />
        </span>
      ) : null}
    </span>
  );
}
