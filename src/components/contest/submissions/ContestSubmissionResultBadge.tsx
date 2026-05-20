import {
  isSubmissionPending,
  submissionProgressText,
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

export default function ContestSubmissionResultBadge({
  judgeMessage,
  submission,
  status,
}: ContestSubmissionResultBadgeProps) {
  const tone = submissionStatusTone(status);
  const label = submissionStatusLabel(status);
  const detail = judgeMessage?.trim();
  const progressText = submissionProgressText(submission ?? { status });
  const displayLabel =
    isSubmissionPending(status) && progressText
      ? `${label} - ${progressText}`
      : label;

  return (
    <span
      className={[
        'font-black decoration-1 underline-offset-2',
        toneClassNames[tone],
      ].join(' ')}
    >
      {detail ? `${displayLabel}(${detail})` : displayLabel}
    </span>
  );
}
