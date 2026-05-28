import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import PageLayout from '@/components/common/PageLayout';
import ProblemStatementPanel from '@/components/contest/problem/ProblemStatementPanel';
import { sharedUiText } from '@/data/uiText';
import {
  JudgeIcon,
  OperatorAccessGate,
  OperatorMetricCard,
  OperatorPanel,
  OperatorTabs,
} from '@/components/operator/OperatorShell';
import { getOperatorContestDashboard } from '@/domains/contestAdministration/api';
import { tokenQueryIdentity } from '@/domains/identityAccess/queryIdentity';
import { getOperatorProblems } from '@/domains/problemManagement/api';
import type { Problem } from '@/domains/problemManagement/types';
import { listParticipantTeams } from '@/domains/teamParticipation/api';
import type { ParticipantTeam } from '@/domains/teamParticipation/types';
import {
  getOperatorSubmission,
  listOperatorSubmissionsPage,
  waitOperatorSubmissionStatus,
} from '@/domains/submissionScoreboard/api';
import type { Submission } from '@/domains/submissionScoreboard/types';
import {
  isSubmissionPending,
  parseJudgeDetail,
  submissionProgressText,
  submissionStatusLabel,
} from '@/domains/submissionScoreboard/status';
import { formatApiError } from '@/shared/api/errors';
import { formatDateTime, formatRelativeTime } from '@/shared/lib/dateTime';
import { formatMemoryKb } from '@/shared/lib/formatters';
import useDocumentVisibility from '@/shared/hooks/useDocumentVisibility';
import AnimatedNumber from '@/shared/ui/AnimatedNumber';
import SubmissionStatusBadge from '@/shared/ui/SubmissionStatusBadge';

const SUBMISSIONS_PAGE_SIZE = 20;

function operatorSubmissionDivisionStorageKey(contestId: string) {
  return `zoj.operator.submissions.division.${contestId}`;
}

function operatorSubmissionProblemStorageKey(contestId: string) {
  return `zoj.operator.submissions.problem.${contestId}`;
}

function operatorSubmissionTeamStorageKey(contestId: string) {
  return `zoj.operator.submissions.team.${contestId}`;
}

function readStoredValue(key: string) {
  try {
    return window.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function writeStoredValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures; the in-memory selection still works.
  }
}

export default function OperatorSubmissionsPage() {
  const { contestId } = useParams();

  return (
    <OperatorAccessGate
      contestId={contestId}
      permission="contest.submission.view"
    >
      {(session) =>
        contestId ? (
          <OperatorSubmissionsContent
            contestId={contestId}
            token={session.accessToken}
          />
        ) : (
          <PageLayout title={sharedUiText.contestSelectionRequiredTitle}>
            {sharedUiText.contestSelectionRequiredBody}
          </PageLayout>
        )
      }
    </OperatorAccessGate>
  );
}

function OperatorSubmissionsContent({
  contestId,
  token,
}: {
  contestId: string;
  token: string;
}) {
  const isVisible = useDocumentVisibility();
  const queryClient = useQueryClient();
  const queryIdentity = tokenQueryIdentity(token);
  const waitingIds = useRef(new Set<string>());
  const divisionStorageKey = operatorSubmissionDivisionStorageKey(contestId);
  const problemStorageKey = operatorSubmissionProblemStorageKey(contestId);
  const teamStorageKey = operatorSubmissionTeamStorageKey(contestId);
  const [divisionId, setDivisionId] = useState(() =>
    readStoredValue(divisionStorageKey),
  );
  const [problemId, setProblemId] = useState(() =>
    readStoredValue(problemStorageKey),
  );
  const [teamId, setTeamId] = useState(() => readStoredValue(teamStorageKey));
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const currentCursor = cursorStack.at(-1);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('');
  const [selectedProblemPreviewId, setSelectedProblemPreviewId] = useState('');
  const [selectedOwnerSubmissionId, setSelectedOwnerSubmissionId] =
    useState('');

  const dashboardQuery = useQuery({
    queryKey: ['operator', 'dashboard', contestId, queryIdentity],
    queryFn: () => getOperatorContestDashboard(contestId, token),
  });
  const problemsQuery = useQuery({
    queryKey: ['operator', 'problems', contestId, queryIdentity],
    queryFn: () => getOperatorProblems(contestId, token),
  });
  const submissionsQuery = useQuery({
    enabled: Boolean(divisionId),
    queryKey: [
      'operator',
      'submissions',
      contestId,
      divisionId,
      problemId || null,
      teamId || null,
      currentCursor ?? null,
      queryIdentity,
    ],
    queryFn: () =>
      listOperatorSubmissionsPage(contestId, token, {
        cursor: currentCursor,
        divisionId,
        limit: SUBMISSIONS_PAGE_SIZE,
        problemId: problemId || undefined,
        teamId: teamId || undefined,
      }),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      if (!isVisible) return false;
      const submissions = query.state.data?.data ?? [];
      return submissions.some((submission) =>
        isSubmissionPending(submission.status),
      )
        ? 3_000
        : 15_000;
    },
    refetchIntervalInBackground: false,
  });
  const teamsQuery = useQuery({
    queryKey: ['operator', 'participants', contestId, queryIdentity],
    queryFn: () => listParticipantTeams(contestId, token),
    placeholderData: keepPreviousData,
  });

  const divisions = dashboardQuery.data?.divisions ?? [];
  const problems = problemsQuery.data ?? [];
  const filteredProblems = divisionId
    ? problems.filter((problem) => problem.division_id === divisionId)
    : problems;
  const filteredTeams = useMemo(
    () =>
      divisionId
        ? (teamsQuery.data ?? []).filter(
            (team) => team.division_id === divisionId,
          )
        : (teamsQuery.data ?? []),
    [divisionId, teamsQuery.data],
  );

  useEffect(() => {
    if (!divisions.length) return;
    if (
      !divisionId ||
      !divisions.some((division) => division.division_id === divisionId)
    ) {
      const nextDivisionId = divisions[0].division_id;
      setDivisionId(nextDivisionId);
      writeStoredValue(divisionStorageKey, nextDivisionId);
      setCursorStack([]);
    }
  }, [divisionId, divisionStorageKey, divisions]);

  useEffect(() => {
    if (
      problemId &&
      !filteredProblems.some((problem) => problem.problem_id === problemId)
    ) {
      setProblemId('');
      writeStoredValue(problemStorageKey, '');
      setCursorStack([]);
    }
  }, [filteredProblems, problemId, problemStorageKey]);

  useEffect(() => {
    if (
      teamId &&
      !filteredTeams.some((team) => team.participant_team_id === teamId)
    ) {
      setTeamId('');
      writeStoredValue(teamStorageKey, '');
      setCursorStack([]);
    }
  }, [filteredTeams, teamId, teamStorageKey]);

  useEffect(() => {
    if (!isVisible) return;

    (submissionsQuery.data?.data ?? [])
      .filter((submission) => isSubmissionPending(submission.status))
      .forEach((submission) => {
        if (waitingIds.current.has(submission.submission_id)) return;

        waitingIds.current.add(submission.submission_id);
        void waitOperatorSubmissionStatus(
          contestId,
          submission.submission_id,
          token,
          {
            pollIntervalSeconds: 0.5,
            waitSeconds: 4,
          },
        )
          .then(() => {
            void queryClient.invalidateQueries({
              queryKey: ['operator', 'submissions', contestId],
            });
            void queryClient.invalidateQueries({
              queryKey: ['operator', 'dashboard', contestId],
            });
          })
          .catch(() => undefined)
          .finally(() => {
            waitingIds.current.delete(submission.submission_id);
          });
      });
  }, [contestId, isVisible, queryClient, submissionsQuery.data, token]);

  const submissions = submissionsQuery.data?.data ?? [];
  const page = submissionsQuery.data?.page;
  const pendingCount = submissions.filter((submission) =>
    isSubmissionPending(submission.status),
  ).length;
  const problemById = useMemo(
    () =>
      new Map(
        (problemsQuery.data ?? []).map((problem) => [
          problem.problem_id,
          problem,
        ]),
      ),
    [problemsQuery.data],
  );
  const teamById = useMemo(
    () =>
      new Map(
        (teamsQuery.data ?? []).map((team) => [team.participant_team_id, team]),
      ),
    [teamsQuery.data],
  );
  const selectedProblemPreview = selectedProblemPreviewId
    ? (problemById.get(selectedProblemPreviewId) ?? null)
    : null;
  const selectedOwnerSubmission = selectedOwnerSubmissionId
    ? (submissions.find(
        (submission) => submission.submission_id === selectedOwnerSubmissionId,
      ) ?? null)
    : null;
  const selectedSubmissionQuery = useQuery({
    enabled: Boolean(selectedSubmissionId),
    queryKey: [
      'operator',
      'submission-detail',
      contestId,
      selectedSubmissionId,
      queryIdentity,
    ],
    queryFn: () =>
      getOperatorSubmission(contestId, selectedSubmissionId, token),
  });

  return (
    <PageLayout
      description="대회 전체 제출과 채점 진행 상태를 운영자 기준으로 확인합니다."
      eyebrow="Operator"
      title={`${dashboardQuery.data?.contest.title ?? '대회'} 제출`}
      width="full"
    >
      <OperatorTabs contestId={contestId} />

      {dashboardQuery.error ||
      problemsQuery.error ||
      submissionsQuery.error ||
      teamsQuery.error ? (
        <div className="rounded border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
          {formatApiError(
            dashboardQuery.error ||
              problemsQuery.error ||
              submissionsQuery.error ||
              teamsQuery.error,
            '제출 데이터를 불러오지 못했습니다',
          )}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <OperatorMetricCard
          description="현재 목록 기준"
          icon={<JudgeIcon />}
          label="전체 제출"
          tone="indigo"
          value={<AnimatedNumber value={submissions.length} />}
        />
        <OperatorMetricCard
          description="채점 중 또는 대기"
          icon={<JudgeIcon />}
          label="진행 중"
          tone="amber"
          value={<AnimatedNumber value={pendingCount} />}
        />
        <OperatorMetricCard
          description="대시보드 집계"
          icon={<JudgeIcon />}
          label="대기 작업"
          tone="cyan"
          value={
            <AnimatedNumber value={dashboardQuery.data?.pending_jobs ?? 0} />
          }
        />
      </div>

      <OperatorPanel
        actions={
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 text-sm font-black text-slate-700">
              유형
              <select
                className="h-10 rounded border border-slate-200 px-3 text-sm font-bold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                onChange={(event) => {
                  const nextDivisionId = event.target.value;
                  setDivisionId(nextDivisionId);
                  setProblemId('');
                  setTeamId('');
                  writeStoredValue(divisionStorageKey, nextDivisionId);
                  writeStoredValue(problemStorageKey, '');
                  writeStoredValue(teamStorageKey, '');
                  setCursorStack([]);
                }}
                value={divisionId}
              >
                {divisions.map((division) => (
                  <option
                    key={division.division_id}
                    value={division.division_id}
                  >
                    {division.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-black text-slate-700">
              문제
              <select
                className="h-10 min-w-52 rounded border border-slate-200 px-3 text-sm font-bold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                onChange={(event) => {
                  const nextProblemId = event.target.value;
                  setProblemId(nextProblemId);
                  writeStoredValue(problemStorageKey, nextProblemId);
                  setCursorStack([]);
                }}
                value={problemId}
              >
                <option value="">전체</option>
                {filteredProblems.map((problem) => (
                  <option key={problem.problem_id} value={problem.problem_id}>
                    {problem.problem_code}. {problem.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-black text-slate-700">
              팀
              <select
                className="h-10 min-w-52 rounded border border-slate-200 px-3 text-sm font-bold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                onChange={(event) => {
                  const nextTeamId = event.target.value;
                  setTeamId(nextTeamId);
                  writeStoredValue(teamStorageKey, nextTeamId);
                  setCursorStack([]);
                }}
                value={teamId}
              >
                <option value="">전체</option>
                {filteredTeams.map((team) => (
                  <option
                    key={team.participant_team_id}
                    value={team.participant_team_id}
                  >
                    {team.team_name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        }
        description="제출 상세에서 소스, 컴파일 로그, 실패 케이스 입출력을 확인합니다."
        title="제출 목록"
      >
        <OperatorSubmissionsTable
          onSelectOwner={(submissionId) =>
            setSelectedOwnerSubmissionId(submissionId)
          }
          onSelectProblem={(problemId) =>
            setSelectedProblemPreviewId(problemId)
          }
          onSelectSubmission={setSelectedSubmissionId}
          problemById={problemById}
          submissions={submissions}
        />
        <PaginationControls
          currentCount={submissions.length}
          currentCursor={page?.current_cursor ?? currentCursor ?? null}
          isFetching={submissionsQuery.isFetching}
          onNext={() => {
            if (page?.next_cursor) {
              setCursorStack((prev) => [...prev, page.next_cursor!]);
            }
          }}
          onPrevious={() => setCursorStack((prev) => prev.slice(0, -1))}
          pageSize={SUBMISSIONS_PAGE_SIZE}
          totalCount={page?.total_count ?? null}
          hasNext={Boolean(page?.next_cursor)}
          hasPrevious={cursorStack.length > 0}
        />
        {!submissionsQuery.isLoading && submissions.length === 0 ? (
          <p className="rounded border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-bold text-slate-500">
            표시할 제출이 없습니다.
          </p>
        ) : null}
      </OperatorPanel>

      {selectedSubmissionId ? (
        <SubmissionDetailModal
          error={selectedSubmissionQuery.error}
          isLoading={selectedSubmissionQuery.isLoading}
          onClose={() => setSelectedSubmissionId('')}
          problemById={problemById}
          submission={selectedSubmissionQuery.data}
        />
      ) : null}
      {selectedProblemPreview ? (
        <ProblemPreviewModal
          onClose={() => setSelectedProblemPreviewId('')}
          problem={selectedProblemPreview}
        />
      ) : null}
      {selectedOwnerSubmission ? (
        <TeamDetailModal
          onClose={() => setSelectedOwnerSubmissionId('')}
          submission={selectedOwnerSubmission}
          team={
            selectedOwnerSubmission.participant_team_id
              ? teamById.get(selectedOwnerSubmission.participant_team_id)
              : undefined
          }
        />
      ) : null}
    </PageLayout>
  );
}

function isOperatorTestSubmission(submission: Submission) {
  if (submission.submission_kind === 'operator_test') return true;
  return (
    submission.team_name?.startsWith('__operator_test__:') ||
    submission.team?.team_name?.startsWith('__operator_test__:') ||
    submission.participant_team_id?.startsWith('__operator_test__:')
  );
}

function isMockJudgingSubmission(submission: Submission) {
  return submission.submission_kind === 'mock_judging';
}

function displaySubmissionId(submissionId: string) {
  return submissionId.split('-')[0] || submissionId;
}

function submissionProblem(
  submission: Submission,
  problemById: Map<string, Problem>,
) {
  return submission.problem ?? problemById.get(submission.problem_id) ?? null;
}

function submissionProblemLabel(
  submission: Submission,
  problemById: Map<string, Problem>,
) {
  const problem = submissionProblem(submission, problemById);
  if (problem) return `${problem.problem_code}. ${problem.title}`;
  return (
    submission.problem_title ?? submission.problem_code ?? submission.problem_id
  );
}

function submissionOwner(submission: Submission) {
  if (isMockJudgingSubmission(submission)) return '모의채점';
  if (isOperatorTestSubmission(submission)) {
    const name = submission.submitted_by_name?.trim();
    return name ? `운영자(${name})` : '운영자';
  }
  const teamName = submission.team_name ?? submission.team?.team_name ?? '';
  const memberName = submission.member_name ?? submission.member?.name ?? '';
  if (teamName && memberName) return `${teamName}(${memberName})`;
  return teamName || memberName || '-';
}

function submissionMemberName(submission: Submission) {
  return submission.member_name ?? submission.member?.name ?? '-';
}

function submissionMemberEmail(submission: Submission) {
  return submission.member_email ?? submission.member?.email ?? '-';
}

function formatRuntime(value?: number | null) {
  if (value === undefined || value === null) return '-';
  return `${value.toLocaleString('ko-KR')} ms`;
}

function codeLength(submission: Submission) {
  const length =
    submission.code_length_bytes ??
    submission.source_code_length ??
    submission.source_code?.length ??
    null;
  return typeof length === 'number'
    ? `${length.toLocaleString('ko-KR')} B`
    : '-';
}

function OperatorSubmissionsTable({
  onSelectOwner,
  onSelectProblem,
  onSelectSubmission,
  problemById,
  submissions,
}: {
  onSelectOwner: (submissionId: string) => void;
  onSelectProblem: (problemId: string) => void;
  onSelectSubmission: (submissionId: string) => void;
  problemById: Map<string, Problem>;
  submissions: Submission[];
}) {
  const headerClass = 'border-r border-slate-200 px-4 py-3 last:border-r-0';
  const cellClass =
    'border-r border-slate-100 px-4 py-4 align-top last:border-r-0';

  return (
    <div className="zoj-horizontal-scroll rounded border border-slate-200 bg-white">
      <table className="w-full min-w-[1180px] table-fixed border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs font-black text-slate-500">
          <tr>
            <th className={`${headerClass} w-28`}>제출</th>
            <th className={`${headerClass} w-44`}>팀/계정</th>
            <th className={`${headerClass} w-64`}>문제</th>
            <th className={`${headerClass} w-36`}>결과</th>
            <th className={`${headerClass} w-24`}>언어</th>
            <th className={`${headerClass} w-28`}>진행</th>
            <th className={`${headerClass} w-24`}>시간</th>
            <th className={`${headerClass} w-28`}>메모리</th>
            <th className={`${headerClass} w-32`}>제출 시각</th>
            <th className={`${headerClass} w-24`}>상세</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {submissions.map((submission) => {
            const problem = submissionProblem(submission, problemById);
            return (
              <tr
                className="hover:bg-indigo-50/40"
                key={submission.submission_id}
              >
                <td
                  className={`${cellClass} font-mono text-xs font-bold`}
                  title={submission.submission_id}
                >
                  {displaySubmissionId(submission.submission_id)}
                </td>
                <td className={`${cellClass} font-bold text-slate-800`}>
                  <button
                    className="zoj-truncate-safe max-w-full text-left text-indigo-700 hover:text-indigo-950"
                    onClick={() => onSelectOwner(submission.submission_id)}
                    title={submissionOwner(submission)}
                    type="button"
                  >
                    {submissionOwner(submission)}
                  </button>
                </td>
                <td className={`${cellClass} font-bold`}>
                  {problem ? (
                    <button
                      className="zoj-truncate-safe max-w-full text-left text-indigo-700 hover:text-indigo-950"
                      onClick={() => onSelectProblem(problem.problem_id)}
                      title={submissionProblemLabel(submission, problemById)}
                      type="button"
                    >
                      {submissionProblemLabel(submission, problemById)}
                    </button>
                  ) : (
                    <span
                      className="zoj-truncate-safe max-w-full"
                      title={submissionProblemLabel(submission, problemById)}
                    >
                      {submissionProblemLabel(submission, problemById)}
                    </span>
                  )}
                </td>
                <td className={cellClass}>
                  <SubmissionStatusBadge submission={submission} compact />
                </td>
                <td className={`${cellClass} font-bold`}>
                  {submission.language}
                </td>
                <td className={`${cellClass} text-xs font-bold text-slate-500`}>
                  {submissionProgressText(submission) || '-'}
                </td>
                <td className={cellClass}>
                  {formatRuntime(
                    submission.runtime_ms ??
                      submission.time_ms ??
                      submission.execution_time_ms,
                  )}
                </td>
                <td className={cellClass}>
                  {formatMemoryKb(
                    submission.memory_kb ??
                      submission.memory_usage_kb ??
                      submission.max_memory_kb,
                  )}
                </td>
                <td
                  className={`${cellClass} text-xs font-bold text-slate-500`}
                  title={formatDateTime(submission.submitted_at)}
                >
                  {formatRelativeTime(submission.submitted_at)}
                </td>
                <td className={cellClass}>
                  <button
                    className="rounded border border-indigo-200 px-3 py-2 text-xs font-black whitespace-nowrap text-indigo-700 hover:bg-indigo-50"
                    onClick={() => onSelectSubmission(submission.submission_id)}
                    type="button"
                  >
                    보기
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PaginationControls({
  currentCount,
  currentCursor,
  hasNext,
  hasPrevious,
  isFetching,
  onNext,
  onPrevious,
  pageSize,
  totalCount,
}: {
  currentCount: number;
  currentCursor: string | null;
  hasNext: boolean;
  hasPrevious: boolean;
  isFetching: boolean;
  onNext: () => void;
  onPrevious: () => void;
  pageSize: number;
  totalCount: number | null;
}) {
  const start = currentCount
    ? Number(currentCursor ?? 0) + 1
    : Number(currentCursor ?? 0);
  const end = Number(currentCursor ?? 0) + currentCount;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-slate-600">
      <span>
        {totalCount === null
          ? `${start}-${end}`
          : `${start}-${end} / ${totalCount.toLocaleString('ko-KR')}`}
        {isFetching ? ' · 갱신 중' : ''}
      </span>
      <div className="flex gap-2">
        <button
          className="h-9 rounded border border-slate-200 px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:text-slate-300"
          disabled={!hasPrevious || isFetching}
          onClick={onPrevious}
          type="button"
        >
          이전
        </button>
        <button
          className="h-9 rounded border border-slate-200 px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:text-slate-300"
          disabled={!hasNext || isFetching || currentCount < pageSize}
          onClick={onNext}
          type="button"
        >
          다음
        </button>
      </div>
    </div>
  );
}

function ProblemPreviewModal({
  onClose,
  problem,
}: {
  onClose: () => void;
  problem: Problem;
}) {
  return (
    <div
      aria-modal="true"
      className="zoj-modal-backdrop"
      role="dialog"
    >
      <section className="zoj-modal-shell grid h-full max-w-6xl grid-rows-[auto_minmax(0,1fr)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-black text-indigo-600 uppercase">
              Problem preview
            </p>
            <h2 className="text-xl font-black text-slate-950">
              {problem.problem_code}. {problem.title}
            </h2>
          </div>
          <button
            className="h-10 rounded border border-slate-200 px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            닫기
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto">
          <ProblemStatementPanel problem={problem} />
        </div>
      </section>
    </div>
  );
}

function TeamDetailModal({
  onClose,
  submission,
  team,
}: {
  onClose: () => void;
  submission: Submission;
  team?: ParticipantTeam;
}) {
  const isOperatorTest = isOperatorTestSubmission(submission);
  const isMockJudging = isMockJudgingSubmission(submission);
  const members = team?.members ?? [];
  const leader = members.find((member) => member.role === 'leader');

  return (
    <div
      aria-modal="true"
      className="zoj-modal-backdrop"
      role="dialog"
    >
      <section className="zoj-modal-shell grid max-w-2xl grid-rows-[auto_minmax(0,1fr)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-black text-indigo-600 uppercase">
              Team account
            </p>
            <h2 className="zoj-break-anywhere text-xl font-black text-slate-950">
              {submissionOwner(submission)}
            </h2>
          </div>
          <button
            className="h-10 rounded border border-slate-200 px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            닫기
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto p-5">
          {isOperatorTest || isMockJudging ? (
            <p className="rounded border border-indigo-100 bg-indigo-50 px-4 py-5 text-sm font-bold text-indigo-700">
              {isMockJudging
                ? '참가자 화면에서 종료 후 모의채점으로 생성된 제출입니다.'
                : '운영자가 문제 검증을 위해 생성한 테스트 제출입니다.'}
            </p>
          ) : (
            <div className="grid gap-5">
              <div className="grid gap-3 md:grid-cols-2">
                <DetailCard
                  label="팀 이름"
                  value={team?.team_name ?? submissionOwner(submission)}
                />
                <DetailCard
                  label="제출자"
                  value={`${submissionMemberName(submission)} / ${submissionMemberEmail(submission)}`}
                />
                <DetailCard
                  label="팀장"
                  value={
                    leader
                      ? `${leader.name} / ${leader.email}`
                      : '팀장 정보 없음'
                  }
                />
                <DetailCard label="상태" value={team?.status ?? '-'} />
              </div>
              <div className="grid gap-2">
                <p className="text-sm font-black text-slate-800">팀원</p>
                {members.length ? (
                  members.map((member) => (
                    <div
                      className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-200 px-4 py-3 text-sm"
                      key={member.team_member_id ?? member.email}
                    >
                      <span className="min-w-0 font-black text-slate-950">
                        {member.name}
                      </span>
                      <span className="zoj-break-anywhere min-w-0 font-bold text-slate-500">
                        {member.email}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                        {member.role === 'leader' ? '팀장' : '팀원'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="rounded border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-bold text-slate-500">
                    팀 상세 정보를 불러오지 못했습니다.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SubmissionDetailModal({
  error,
  isLoading,
  onClose,
  problemById,
  submission,
}: {
  error: unknown;
  isLoading: boolean;
  onClose: () => void;
  problemById: Map<string, Problem>;
  submission?: Submission;
}) {
  const detail = parseJudgeDetail(submission?.judge_message);

  return (
    <div
      aria-modal="true"
      className="zoj-modal-backdrop"
      role="dialog"
    >
      <section className="zoj-modal-shell grid h-full max-w-7xl grid-rows-[auto_minmax(0,1fr)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-black text-indigo-600 uppercase">
              Submission detail
            </p>
            <h2 className="zoj-break-anywhere text-xl font-black text-slate-950">
              {submission
                ? `${submissionOwner(submission)} · ${displaySubmissionId(submission.submission_id)}`
                : '제출 상세'}
            </h2>
          </div>
          <button
            className="h-10 rounded border border-slate-200 px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            닫기
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto p-5">
          {isLoading ? (
            <p className="rounded border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">
              제출 상세를 불러오는 중입니다.
            </p>
          ) : null}
          {error ? (
            <p className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {formatApiError(error, '제출 상세를 불러오지 못했습니다')}
            </p>
          ) : null}
          {submission ? (
            <div className="grid gap-5">
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                <DetailCard
                  label="팀/계정"
                  value={submissionOwner(submission)}
                />
                <DetailCard
                  label="문제"
                  value={submissionProblemLabel(submission, problemById)}
                />
                <DetailCard
                  label="결과"
                  value={submissionStatusLabel(submission.status)}
                />
                <DetailCard label="언어" value={String(submission.language)} />
                <DetailCard
                  label="실패 케이스"
                  value={String(submission.failed_testcase_order ?? '-')}
                />
                <DetailCard label="코드 길이" value={codeLength(submission)} />
                <DetailCard
                  label="시간"
                  value={formatRuntime(
                    submission.runtime_ms ??
                      submission.time_ms ??
                      submission.execution_time_ms,
                  )}
                />
                <DetailCard
                  label="메모리"
                  value={formatMemoryKb(
                    submission.memory_kb ??
                      submission.memory_usage_kb ??
                      submission.max_memory_kb,
                  )}
                />
                <DetailCard
                  label="진행"
                  value={submissionProgressText(submission) || '-'}
                />
                <DetailCard
                  label="제출 시각"
                  value={formatDateTime(submission.submitted_at)}
                />
                <DetailCard label="제출 ID" value={submission.submission_id} />
              </div>
              <LogBlock
                label="소스 코드"
                value={submission.source_code || '-'}
              />
              <LogBlock
                label="컴파일 로그"
                value={submission.compile_message || '-'}
              />
              <LogBlock
                label="채점 로그"
                value={submission.judge_message || '-'}
              />
              <div className="grid gap-4 lg:grid-cols-3">
                <LogBlock label="실패 입력" value={detail.inputText || '-'} />
                <LogBlock
                  label="기대 출력"
                  value={detail.expectedText || '-'}
                />
                <LogBlock label="실제 출력" value={detail.actualText || '-'} />
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-1 rounded border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-xs font-black text-slate-500">{label}</span>
      <strong className="zoj-break-anywhere text-sm font-black text-slate-950">
        {value}
      </strong>
    </div>
  );
}

function LogBlock({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-2 text-sm font-black text-slate-700">
      {label}
      <pre className="max-h-96 overflow-auto rounded border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-xs leading-5 whitespace-pre-wrap text-slate-50">
        {value}
      </pre>
    </label>
  );
}
