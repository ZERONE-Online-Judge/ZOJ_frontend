import {
  submissionStatusLabel,
  submissionStatusTone,
} from '@/domains/submissionScoreboard/status';

type ContestSubmissionResultBadgeProps = {
  status: string;
};

const toneClassNames = {
  success: 'text-emerald-600',
  pending: 'text-slate-500',
  danger: 'text-red-500',
  neutral: 'text-slate-500',
} as const;

export default function ContestSubmissionResultBadge({
  status,
}: ContestSubmissionResultBadgeProps) {
  const tone = submissionStatusTone(status);

  return (
    <span
      className={[
        'font-black underline decoration-current decoration-1 underline-offset-2',
        toneClassNames[tone],
      ].join(' ')}
    >
      {submissionStatusLabel(status)}
    </span>
  );
}
