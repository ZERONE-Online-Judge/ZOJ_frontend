import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Submission } from '@/domains/submissionScoreboard/types';
import type { Problem } from '@/domains/problemManagement/types';
import { formatRelativeTime } from '@/shared/lib/dateTime';
import { formatMemoryKb } from '@/shared/lib/formatters';
import ContestSubmissionResultBadge from '@/components/contest/submissions/ContestSubmissionResultBadge';
import { SvgIcon } from '@/utils/Icons';

type ContestSubmissionsTableProps = {
  contestId: string;
  fallbackMemberName?: string;
  fallbackTeamName?: string;
  problems?: Problem[];
  submissions: Submission[];
};

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

function isOperatorTestSubmission(submission: Submission) {
  return (
    submission.team_name?.startsWith('__operator_test__:') ||
    submission.team?.team_name?.startsWith('__operator_test__:') ||
    submission.participant_team_id?.startsWith('__operator_test__:')
  );
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
  if (isOperatorTestSubmission(submission)) return '운영자 테스트';

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

function submissionProblemId(
  submission: Submission,
  problemById: Map<string, Problem>,
) {
  return (
    submission.problem?.problem_id ??
    problemById.get(submission.problem_id)?.problem_id ??
    submission.problem_id
  );
}

function submissionSourceCode(submission: Submission) {
  return submission.source_code ?? '';
}

export default function ContestSubmissionsTable({
  contestId,
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
  const [previewSubmission, setPreviewSubmission] = useState<Submission | null>(
    null,
  );

  return (
    <>
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
              <th className={`${headerCellClassName} w-36`}>언어</th>
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
              const problemId = submissionProblemId(submission, problemById);
              const sourceCode = submissionSourceCode(submission);

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
                    <Link
                      className="hover:text-zoj-blue transition"
                      to={`/contests/${contestId}/problems/${problemId}`}
                    >
                      {submissionProblem(submission, problemById)}
                    </Link>
                  </td>
                  <td className={cellClassName}>
                    <ContestSubmissionResultBadge
                      judgeMessage={submission.judge_message}
                      submission={submission}
                      status={submission.status}
                    />
                  </td>
                  <td className={cellClassName}>
                    {formatMemoryKb(submissionMemory(submission))}
                  </td>
                  <td className={cellClassName}>
                    {formatTimeMs(submissionTime(submission))}
                  </td>
                  <td className={cellClassName}>
                    <span className="inline-flex items-center gap-3">
                      <button
                        className="font-bold text-slate-950 transition hover:text-zoj-blue"
                        disabled={!sourceCode}
                        onClick={() => setPreviewSubmission(submission)}
                        title={sourceCode ? '제출 코드 보기' : '코드가 포함되지 않은 제출입니다.'}
                        type="button"
                      >
                        {submission.language}
                      </button>
                      {sourceCode ? (
                        <Link
                          className="text-xs font-black text-zoj-blue transition hover:text-slate-950"
                          to={`/contests/${contestId}/problems/${problemId}/submit?submissionId=${encodeURIComponent(submission.submission_id)}`}
                        >
                          수정
                        </Link>
                      ) : null}
                    </span>
                  </td>
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
      {previewSubmission ? (
        <SubmissionCodeModal
          onClose={() => setPreviewSubmission(null)}
          submission={previewSubmission}
        />
      ) : null}
    </>
  );
}

function SubmissionCodeModal({
  onClose,
  submission,
}: {
  onClose: () => void;
  submission: Submission;
}) {
  const sourceCode = submissionSourceCode(submission);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <section className="grid max-h-[86vh] w-full max-w-4xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-black text-slate-950">
            {submission.language}
          </h2>
          <div className="flex items-center gap-2">
            <button
              aria-label="제출 코드 복사"
              className="flex size-9 items-center justify-center rounded border border-slate-200 text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              onClick={() => void navigator.clipboard?.writeText(sourceCode)}
              title="제출 코드 복사"
              type="button"
            >
              <SvgIcon name="clipboard" size={16} />
            </button>
            <button
              aria-label="닫기"
              className="flex size-9 items-center justify-center rounded border border-slate-200 text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              onClick={onClose}
              type="button"
            >
              <SvgIcon name="close" size={14} />
            </button>
          </div>
        </header>
        <pre className="min-h-0 overflow-auto bg-slate-950 p-5 text-sm leading-6 text-slate-50">
          <code>{sourceCode}</code>
        </pre>
      </section>
    </div>
  );
}
