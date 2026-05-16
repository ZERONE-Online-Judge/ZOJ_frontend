import {
  submissionStatusLabel,
  submissionStatusTone,
} from '@/domains/submissionScoreboard/status';

type ContestSubmissionResultBadgeProps = {
  judgeMessage?: string | null;
  status: string;
};

const toneClassNames = {
  success: 'text-emerald-600 no-underline',
  pending: 'text-slate-950 underline decoration-current',
  danger: 'text-red-500 no-underline',
  neutral: 'text-slate-950 underline decoration-current',
} as const;

export default function ContestSubmissionResultBadge({
  judgeMessage,
  status,
}: ContestSubmissionResultBadgeProps) {
  const tone = submissionStatusTone(status);
  const label = submissionStatusLabel(status);
  const detail = judgeMessage?.trim();

  return (
    <span
      className={[
        'font-black decoration-1 underline-offset-2',
        toneClassNames[tone],
      ].join(' ')}
    >
      {detail ? `${label}(${detail})` : label}
    </span>
  );
}
