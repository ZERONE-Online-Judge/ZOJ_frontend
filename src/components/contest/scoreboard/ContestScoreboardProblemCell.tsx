import type { ScoreboardProblemScore } from '@/domains/submissionScoreboard/types';

type ContestScoreboardProblemCellProps = {
  score?: ScoreboardProblemScore;
};

function scoreLabel(score?: ScoreboardProblemScore) {
  if (!score) return '';
  if (score.solved) {
    return score.wrong_attempts > 0 ? `+${score.wrong_attempts}` : '✓';
  }
  if (score.attempts > 0) return `-${score.attempts}`;

  return '';
}

export default function ContestScoreboardProblemCell({
  score,
}: ContestScoreboardProblemCellProps) {
  const label = scoreLabel(score);
  if (!label) return null;

  const isSolved = score?.solved;

  return (
    <span
      className={[
        'inline-flex size-7 items-center justify-center rounded-full text-xs font-black',
        isSolved
          ? 'bg-emerald-100 text-slate-950'
          : 'bg-red-100 text-slate-950',
      ].join(' ')}
    >
      {label}
    </span>
  );
}
