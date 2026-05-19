import ContestScoreboardProblemCell from '@/components/contest/scoreboard/ContestScoreboardProblemCell';
import type { Problem } from '@/domains/problemManagement/types';
import type {
  ScoreboardProblemScore,
  ScoreboardRow,
} from '@/domains/submissionScoreboard/types';

type ContestScoreboardTableProps = {
  problems?: Problem[];
  rows: ScoreboardRow[];
};

function scoreboardProblems(rows: ScoreboardRow[], problems: Problem[]) {
  const problemMap = new Map<string, ScoreboardProblemScore>();

  problems.forEach((problem) => {
    problemMap.set(problem.problem_code, {
      problem_id: problem.problem_id,
      problem_code: problem.problem_code,
      score: 0,
      max_score: problem.max_score,
      attempts: 0,
      wrong_attempts: 0,
      solved: false,
      best_status: null,
    });
  });

  rows.forEach((row) => {
    row.problem_scores.forEach((score) => {
      if (!problemMap.has(score.problem_code)) {
        problemMap.set(score.problem_code, score);
      }
    });
  });

  return Array.from(problemMap.values()).sort((a, b) =>
    a.problem_code.localeCompare(b.problem_code, 'ko-KR', {
      numeric: true,
    }),
  );
}

function totalPenalty(row: ScoreboardRow) {
  const value = row.penalty ?? row.score;
  if (value === undefined || value === null) return '-';

  return value.toLocaleString('ko-KR');
}

function submissionCount(row: ScoreboardRow) {
  return row.submission_count?.toLocaleString('ko-KR') ?? '-';
}

export default function ContestScoreboardTable({
  problems = [],
  rows,
}: ContestScoreboardTableProps) {
  const scoreboardProblemScores = scoreboardProblems(rows, problems);
  const headerCellClassName =
    'border-r border-slate-200 px-5 py-4 last:border-r-0';
  const bodyCellClassName =
    'border-r border-slate-200 px-5 py-5 font-medium text-slate-950 last:border-r-0';
  const problemHeaderCellClassName =
    'w-12 border-r border-slate-200 px-2 py-4 text-center last:border-r-0';
  const problemBodyCellClassName =
    'border-r border-slate-200 px-2 py-4 text-center last:border-r-0';

  return (
    <div className="overflow-x-auto border border-slate-200 bg-white">
      <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-white text-xs font-black text-slate-950">
            <th className={`${headerCellClassName} w-24`}>순위</th>
            <th className={`${headerCellClassName} min-w-72`}>팀명</th>
            <th className={`${headerCellClassName} w-24`}>해결</th>
            <th className={`${headerCellClassName} w-24`}>시도</th>
            {scoreboardProblemScores.map((problem) => (
              <th
                className={problemHeaderCellClassName}
                key={problem.problem_code}
              >
                {problem.problem_code}
              </th>
            ))}
            <th className={`${headerCellClassName} w-32`}>총시간(min)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              className="border-b border-slate-200 last:border-b-0 odd:bg-slate-50/80"
              key={`${row.rank}-${row.team_id ?? row.team_name}`}
            >
              <td className={`${bodyCellClassName} font-bold`}>{row.rank}위</td>
              <td className={`${bodyCellClassName} font-bold`}>
                {row.team_name}
              </td>
              <td className={`${bodyCellClassName} font-bold`}>
                {row.solved}개
              </td>
              <td className={bodyCellClassName}>{submissionCount(row)}</td>
              {scoreboardProblemScores.map((problem) => {
                const score = row.problem_scores.find(
                  (item) => item.problem_code === problem.problem_code,
                );

                return (
                  <td
                    className={problemBodyCellClassName}
                    key={problem.problem_code}
                  >
                    <ContestScoreboardProblemCell score={score} />
                  </td>
                );
              })}
              <td className={bodyCellClassName}>{totalPenalty(row)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
