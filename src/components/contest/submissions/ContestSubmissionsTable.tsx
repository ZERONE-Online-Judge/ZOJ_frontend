import type { Submission } from '@/domains/submissionScoreboard/types';
import type { Problem } from '@/domains/problemManagement/types';
import { formatRelativeTime } from '@/shared/lib/dateTime';
import ContestSubmissionResultBadge from '@/components/contest/submissions/ContestSubmissionResultBadge';

type ContestSubmissionsTableProps = {
  fallbackMemberName?: string;
  fallbackTeamName?: string;
  problems?: Problem[];
  submissions: Submission[];
};

function formatMemory(value?: number | null) {
  if (value === undefined || value === null) return '-';
  return `${value.toLocaleString('ko-KR')} KB`;
}

function formatTimeMs(value?: number | null) {
  if (value === undefined || value === null) return '-';
  return `${value.toLocaleString('ko-KR')} ms`;
}

function formatCodeLength(submission: Submission) {
  const length =
    submission.code_length_bytes ??
    submission.source_code_length ??
    submission.source_code?.length ??
    null;
  if (length === null) return '-';

  return `${length.toLocaleString('ko-KR')} B`;
}

function displaySubmissionId(submissionId: string) {
  return submissionId.split('-')[0] || submissionId;
}

function submissionMemory(submission: Submission) {
  return (
    submission.memory_kb ??
    submission.memory_usage_kb ??
    submission.max_memory_kb ??
    null
  );
}

function submissionTime(submission: Submission) {
  return (
    submission.time_ms ??
    submission.execution_time_ms ??
    submission.runtime_ms ??
    null
  );
}

function submissionName(
  submission: Submission,
  fallbackTeamName?: string,
  fallbackMemberName?: string,
) {
  return (
    submission.team_name ??
    submission.team?.team_name ??
    submission.member_name ??
    submission.member?.name ??
    fallbackTeamName ??
    fallbackMemberName ??
    '-'
  );
}

function submissionProblem(
  submission: Submission,
  problemById: Map<string, Problem>,
) {
  const problem = submission.problem ?? problemById.get(submission.problem_id);
  return (
    problem?.problem_code ?? submission.problem_code ?? submission.problem_id
  );
}

function submissionProblemTitle(
  submission: Submission,
  problemById: Map<string, Problem>,
) {
  const problem = submission.problem ?? problemById.get(submission.problem_id);
  if (!problem) return submission.problem_title ?? submission.problem_id;

  return `${problem.problem_code}. ${problem.title}`;
}

export default function ContestSubmissionsTable({
  fallbackMemberName,
  fallbackTeamName,
  problems = [],
  submissions,
}: ContestSubmissionsTableProps) {
  const problemById = new Map(
    problems.map((problem) => [problem.problem_id, problem]),
  );
  const cellClassName =
    'border-r border-slate-200 px-5 py-4 font-medium text-slate-950 last:border-r-0';
  const headerCellClassName =
    'border-r border-slate-200 px-5 py-4 last:border-r-0';

  return (
    <div className="overflow-x-auto border border-slate-200 bg-white">
      <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-white text-xs font-black text-slate-950">
            <th className={`${headerCellClassName} w-28`}>제출번호</th>
            <th className={`${headerCellClassName} w-32`}>이름</th>
            <th className={`${headerCellClassName} w-20`}>문제</th>
            <th className={headerCellClassName}>결과</th>
            <th className={`${headerCellClassName} w-28`}>메모리</th>
            <th className={`${headerCellClassName} w-24`}>시간</th>
            <th className={`${headerCellClassName} w-32`}>언어</th>
            <th className={`${headerCellClassName} w-28`}>코드 길이</th>
            <th className={`${headerCellClassName} w-36`}>제출한 시간</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((submission) => {
            const name = submissionName(
              submission,
              fallbackTeamName,
              fallbackMemberName,
            );

            return (
              <tr
                className="border-b border-slate-200 last:border-b-0 odd:bg-slate-50/80"
                key={submission.submission_id}
              >
                <td
                  className={`${cellClassName} font-mono text-xs font-bold`}
                  title={submission.submission_id}
                >
                  {displaySubmissionId(submission.submission_id)}
                </td>
                <td
                  className={`${cellClassName} max-w-32 truncate font-bold`}
                  title={name}
                >
                  {name}
                </td>
                <td
                  className={`${cellClassName} font-bold`}
                  title={submissionProblemTitle(submission, problemById)}
                >
                  {submissionProblem(submission, problemById)}
                </td>
                <td className={cellClassName}>
                  <ContestSubmissionResultBadge status={submission.status} />
                </td>
                <td className={cellClassName}>
                  {formatMemory(submissionMemory(submission))}
                </td>
                <td className={cellClassName}>
                  {formatTimeMs(submissionTime(submission))}
                </td>
                <td className={cellClassName}>{submission.language}</td>
                <td className={cellClassName}>
                  {formatCodeLength(submission)}
                </td>
                <td className={cellClassName}>
                  {formatRelativeTime(submission.submitted_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
