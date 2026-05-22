import { useEffect, useRef, useState } from 'react';
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  AdminAccessGate,
  AdminMetricCard,
  AdminPanel,
  AdminTabs,
  JudgeIcon,
} from '@/components/admin/AdminShell';
import PageLayout from '@/components/common/PageLayout';
import ContestSubmissionResultBadge from '@/components/contest/submissions/ContestSubmissionResultBadge';
import {
  getAdminJudgeDashboard,
  getAdminJudgeSubmission,
  listAdminJudgeSubmissions,
  waitAdminJudgeSubmissionStatus,
} from '@/domains/auditMonitoring/api';
import type { AdminJudgeSubmissionEntry } from '@/domains/auditMonitoring/types';
import { tokenQueryIdentity } from '@/domains/identityAccess/queryIdentity';
import {
  parseJudgeDetail,
  submissionProgressText,
  submissionStatusLabel,
} from '@/domains/submissionScoreboard/status';
import { formatApiError } from '@/shared/api/errors';
import { formatDateTime, formatRelativeTime } from '@/shared/lib/dateTime';
import AnimatedNumber from '@/shared/ui/AnimatedNumber';
import useDocumentVisibility from '@/shared/hooks/useDocumentVisibility';

const pendingSubmissionStatuses = new Set([
  'pending',
  'queued',
  'running',
  'processing',
  'judging',
  'wait',
  'waiting',
]);

const ADMIN_JUDGE_PAGE_SIZE = 20;

function readStoredValue(key: string) {
  try {
    return window.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function writeStoredValue(key: string, value: string) {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures; the in-memory filter still works.
  }
}

export default function AdminJudgePage() {
  return (
    <AdminAccessGate>
      {(session) => <AdminJudgeContent token={session.accessToken} />}
    </AdminAccessGate>
  );
}

function AdminJudgeContent({ token }: { token: string }) {
  const isVisible = useDocumentVisibility();
  const queryClient = useQueryClient();
  const queryIdentity = tokenQueryIdentity(token);
  const [cursor, setCursor] = useState<string | undefined>();
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [contestFilter, setContestFilter] = useState(() =>
    readStoredValue('zoj.admin.judge.contest'),
  );
  const [divisionFilter, setDivisionFilter] = useState(() =>
    readStoredValue('zoj.admin.judge.division'),
  );
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    string | null
  >(null);
  const waitingSubmissionIds = useRef(new Set<string>());

  const dashboardQuery = useQuery({
    queryKey: ['admin', 'judge-dashboard', queryIdentity],
    queryFn: () => getAdminJudgeDashboard(token),
    refetchInterval: isVisible ? 5_000 : false,
    placeholderData: keepPreviousData,
  });

  const submissionsQuery = useQuery({
    queryKey: [
      'admin',
      'judge-submissions',
      contestFilter || 'all-contests',
      divisionFilter || 'all-divisions',
      cursor ?? 'first',
      queryIdentity,
    ],
    queryFn: () =>
      listAdminJudgeSubmissions(token, {
        contestId: contestFilter || undefined,
        cursor,
        divisionId: divisionFilter || undefined,
        includeSource: false,
        limit: ADMIN_JUDGE_PAGE_SIZE,
      }),
    refetchInterval: isVisible ? 5_000 : false,
    placeholderData: keepPreviousData,
  });

  const selectedSubmissionQuery = useQuery({
    enabled: Boolean(selectedSubmissionId),
    queryKey: [
      'admin',
      'judge-submission',
      selectedSubmissionId,
      queryIdentity,
    ],
    queryFn: () => getAdminJudgeSubmission(selectedSubmissionId!, token, true),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!isVisible) return;

    const pendingIds =
      submissionsQuery.data?.data
        .filter((entry) =>
          pendingSubmissionStatuses.has(entry.submission.status),
        )
        .map((entry) => entry.submission.submission_id) ?? [];

    pendingIds.forEach((submissionId) => {
      if (waitingSubmissionIds.current.has(submissionId)) return;

      waitingSubmissionIds.current.add(submissionId);
      void waitAdminJudgeSubmissionStatus(submissionId, token, {
        pollIntervalSeconds: 0.5,
        waitSeconds: 4,
      })
        .then(() => {
          void queryClient.invalidateQueries({
            queryKey: ['admin', 'judge-submissions'],
          });
          void queryClient.invalidateQueries({
            queryKey: ['admin', 'judge-dashboard'],
          });
          if (selectedSubmissionId === submissionId) {
            void queryClient.invalidateQueries({
              queryKey: ['admin', 'judge-submission', submissionId],
            });
          }
        })
        .catch(() => {
          // 짧은 wait 요청은 화면 보조 갱신용이다. 실패는 다음 polling 주기에서 다시 처리한다.
        })
        .finally(() => {
          waitingSubmissionIds.current.delete(submissionId);
        });
    });
  }, [
    isVisible,
    queryClient,
    selectedSubmissionId,
    submissionsQuery.data?.data,
    token,
  ]);

  const dashboard = dashboardQuery.data;
  const submissions = submissionsQuery.data?.data ?? [];
  const page = submissionsQuery.data?.page;
  const nextCursor = submissionsQuery.data?.page.next_cursor ?? null;
  const contestOptions = Array.from(
    new Map(
      submissions
        .map((entry) => entry.contest)
        .filter(Boolean)
        .map((contest) => [contest!.contest_id, contest!]),
    ).values(),
  );
  const divisionOptions = Array.from(
    new Map(
      submissions
        .filter(
          (entry) =>
            !contestFilter || entry.contest?.contest_id === contestFilter,
        )
        .map((entry) => entry.division)
        .filter(Boolean)
        .map((division) => [division!.division_id, division!]),
    ).values(),
  );

  function goNextPage() {
    if (!nextCursor) return;
    setCursorHistory((prev) => [...prev, cursor ?? '']);
    setCursor(nextCursor);
  }

  function goPreviousPage() {
    setCursorHistory((prev) => {
      const next = [...prev];
      const previousCursor = next.pop();
      setCursor(previousCursor || undefined);
      return next;
    });
  }

  function resetPage() {
    setCursor(undefined);
    setCursorHistory([]);
  }

  function updateContestFilter(value: string) {
    setContestFilter(value);
    setDivisionFilter('');
    writeStoredValue('zoj.admin.judge.contest', value);
    writeStoredValue('zoj.admin.judge.division', '');
    resetPage();
  }

  function updateDivisionFilter(value: string) {
    setDivisionFilter(value);
    writeStoredValue('zoj.admin.judge.division', value);
    resetPage();
  }

  return (
    <PageLayout
      description="채점 노드, 큐, 최근 제출을 실시간에 가깝게 확인합니다."
      eyebrow="Service Master"
      title="채점 관리"
      width="7xl"
    >
      <AdminTabs />

      {dashboardQuery.error || submissionsQuery.error ? (
        <div className="rounded border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
          {formatApiError(
            dashboardQuery.error || submissionsQuery.error,
            '채점 관리자 데이터를 불러오지 못했습니다',
          )}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          accent="violet"
          description="현재 활성 상태인 채점 노드"
          icon={<JudgeIcon />}
          label="활성 노드"
          value={
            <AnimatedNumber
              value={
                dashboard?.nodes.filter((node) => node.is_active).length ?? 0
              }
            />
          }
        />
        <AdminMetricCard
          accent="emerald"
          description="전체 노드의 비어 있는 슬롯 합계"
          icon={<JudgeIcon />}
          label="가용 슬롯"
          value={
            <AnimatedNumber
              value={
                dashboard?.nodes.reduce(
                  (sum, node) => sum + node.free_slots,
                  0,
                ) ?? 0
              }
            />
          }
        />
        <AdminMetricCard
          accent="amber"
          description="채점을 기다리는 작업"
          icon={<JudgeIcon />}
          label="대기 큐"
          value={
            <AnimatedNumber
              value={
                dashboard?.queue_stats?.pending_count ??
                dashboard?.queue.length ??
                0
              }
            />
          }
        />
        <AdminMetricCard
          accent="rose"
          description="현재 실행 중인 작업"
          icon={<JudgeIcon />}
          label="실행 중"
          value={
            <AnimatedNumber
              value={dashboard?.queue_stats?.running_count ?? 0}
            />
          }
        />
      </div>

      <div className="grid gap-6">
        <details className="group rounded border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 transition hover:bg-slate-50">
            <span>
              <span className="block text-xl font-black text-slate-950">
                채점 노드 현황
              </span>
              <span className="mt-1 block text-sm font-medium text-slate-500">
                노드 heartbeat와 slot 상태를 확인합니다.
              </span>
            </span>
            <span className="text-sm font-black text-violet-700 group-open:hidden">
              펼치기
            </span>
            <span className="hidden text-sm font-black text-slate-500 group-open:inline">
              접기
            </span>
          </summary>
          <div className="border-t border-slate-100 p-6">
            <div className="overflow-x-auto rounded border border-slate-200">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs font-black text-slate-500">
                  <tr>
                    <th className="border-r border-b border-slate-200 px-4 py-3">
                      노드
                    </th>
                    <th className="border-r border-b border-slate-200 px-4 py-3">
                      상태
                    </th>
                    <th className="border-r border-b border-slate-200 px-4 py-3">
                      슬롯
                    </th>
                    <th className="border-r border-b border-slate-200 px-4 py-3">
                      실행
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3">
                      마지막 신호
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(dashboard?.nodes ?? []).length > 0 ? (
                    (dashboard?.nodes ?? []).map((node) => (
                      <tr
                        className="hover:bg-violet-50/40"
                        key={node.judge_node_id}
                      >
                        <td className="border-r border-slate-100 px-4 py-4">
                          <strong className="font-black text-slate-950">
                            {node.node_name}
                          </strong>
                          <p className="text-xs font-bold text-slate-400">
                            {node.judge_node_id}
                          </p>
                        </td>
                        <td className="border-r border-slate-100 px-4 py-4">
                          <span
                            className={[
                              'rounded-full px-3 py-1 text-xs font-black',
                              node.is_active && node.schedulable
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-600',
                            ].join(' ')}
                          >
                            {node.is_active && node.schedulable
                              ? '활성'
                              : '비활성'}
                          </span>
                        </td>
                        <td className="border-r border-slate-100 px-4 py-4 font-bold text-slate-700">
                          {node.free_slots}/{node.total_slots}
                        </td>
                        <td className="border-r border-slate-100 px-4 py-4 font-bold text-slate-700">
                          {node.running_job_count}
                        </td>
                        <td className="px-4 py-4 font-bold text-slate-500">
                          {formatRelativeTime(node.last_heartbeat_at)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        className="px-4 py-8 text-center text-sm font-bold text-slate-500"
                        colSpan={5}
                      >
                        등록된 채점 노드가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </details>

        <AdminPanel
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-9 rounded border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                onChange={(event) => updateContestFilter(event.target.value)}
                value={contestFilter}
              >
                <option value="">전체 대회</option>
                {contestOptions.map((contest) => (
                  <option key={contest.contest_id} value={contest.contest_id}>
                    {contest.title}
                  </option>
                ))}
              </select>
              <select
                className="h-9 rounded border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                onChange={(event) => updateDivisionFilter(event.target.value)}
                value={divisionFilter}
              >
                <option value="">전체 유형</option>
                {divisionOptions.map((division) => (
                  <option
                    key={division.division_id}
                    value={division.division_id}
                  >
                    {division.name}
                  </option>
                ))}
              </select>
              <button
                className="h-9 rounded border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:text-slate-300"
                disabled={cursorHistory.length === 0}
                onClick={goPreviousPage}
                type="button"
              >
                이전
              </button>
              <button
                className="h-9 rounded border border-violet-200 bg-violet-50 px-3 text-xs font-black text-violet-700 transition hover:bg-violet-100 disabled:text-slate-300"
                disabled={!nextCursor}
                onClick={goNextPage}
                type="button"
              >
                다음
              </button>
            </div>
          }
          description="결과는 간단히 보고, 보기 버튼으로 소스와 채점 로그를 확인합니다."
          title="최근 제출"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-slate-600">
            <span>
              {page?.total_count === undefined || page.total_count === null
                ? `${Number(page?.current_cursor ?? cursor ?? 0) + (submissions.length ? 1 : 0)}-${Number(page?.current_cursor ?? cursor ?? 0) + submissions.length}`
                : `${Number(page.current_cursor ?? cursor ?? 0) + (submissions.length ? 1 : 0)}-${Number(page.current_cursor ?? cursor ?? 0) + submissions.length} / ${page.total_count.toLocaleString('ko-KR')}`}
              {submissionsQuery.isFetching ? ' · 갱신 중' : ''}
            </span>
            <span>페이지당 {ADMIN_JUDGE_PAGE_SIZE}개</span>
          </div>
          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black text-slate-500">
                <tr>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    제출
                  </th>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    대회/유형
                  </th>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    언어
                  </th>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    에이전트
                  </th>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    결과
                  </th>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    시간
                  </th>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    메모리
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-center">
                    보기
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.length > 0 ? (
                  submissions.map((entry) => (
                    <SubmissionRow
                      entry={entry}
                      isSelected={
                        selectedSubmissionId === entry.submission.submission_id
                      }
                      key={entry.submission.submission_id}
                      onSelect={() =>
                        setSelectedSubmissionId(entry.submission.submission_id)
                      }
                    />
                  ))
                ) : (
                  <tr>
                    <td
                      className="px-4 py-10 text-center text-sm font-bold text-slate-500"
                      colSpan={8}
                    >
                      표시할 제출이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </AdminPanel>
      </div>

      {selectedSubmissionId ? (
        <SubmissionDetailModal
          entry={selectedSubmissionQuery.data}
          error={selectedSubmissionQuery.error}
          isLoading={selectedSubmissionQuery.isFetching}
          onClose={() => setSelectedSubmissionId(null)}
        />
      ) : null}
    </PageLayout>
  );
}

function entryOwner(entry: AdminJudgeSubmissionEntry) {
  return (
    entry.team?.team_name ??
    entry.submission.team_name ??
    entry.member?.name ??
    entry.submission.member_name ??
    '-'
  );
}

function entryOwnerDetail(entry: AdminJudgeSubmissionEntry) {
  return (
    entry.member?.email ??
    entry.submission.member_email ??
    entry.contest?.title ??
    '-'
  );
}

function entryProblemLabel(entry: AdminJudgeSubmissionEntry) {
  const code = entry.problem?.problem_code ?? entry.submission.problem_code;
  const title = entry.problem?.title ?? entry.submission.problem_title;
  if (code && title) return `${code}. ${title}`;
  return code ?? title ?? entry.submission.problem_id;
}

function entryContestDivisionLabel(entry: AdminJudgeSubmissionEntry) {
  const contest = entry.contest?.title ?? '-';
  const division = entry.division?.name ?? '-';
  return { contest, division };
}

function entryJudgeNodeLabel(entry: AdminJudgeSubmissionEntry) {
  return (
    entry.judge_node?.node_name ??
    entry.judge_job?.assigned_node_id ??
    '-'
  );
}

function SubmissionRow({
  entry,
  isSelected,
  onSelect,
}: {
  entry: AdminJudgeSubmissionEntry;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { submission } = entry;
  const runtime =
    submission.runtime_ms ?? submission.time_ms ?? submission.execution_time_ms;
  const memory =
    submission.memory_kb ??
    submission.memory_usage_kb ??
    submission.max_memory_kb;
  const progressSubmission = {
    ...submission,
    queue_position: submission.queue_position,
  };
  const contestDivision = entryContestDivisionLabel(entry);

  return (
    <tr className={isSelected ? 'bg-violet-50/70' : 'hover:bg-violet-50/40'}>
      <td
        className="border-r border-slate-100 px-4 py-4 font-mono text-xs font-bold text-slate-700"
        title={`${submission.submission_id} · ${formatDateTime(submission.submitted_at)}`}
      >
        {shortSubmissionId(submission.submission_id)}
        <span className="mt-1 block font-sans text-[11px] font-bold text-slate-400">
          {formatRelativeTime(submission.submitted_at)}
        </span>
      </td>
      <td
        className="border-r border-slate-100 px-4 py-4"
        title={`${contestDivision.contest} / ${contestDivision.division}`}
      >
        <strong className="block max-w-44 truncate font-black text-slate-950">
          {contestDivision.contest}
        </strong>
        <span className="mt-1 block max-w-44 truncate text-xs font-bold text-slate-400">
          {contestDivision.division}
        </span>
      </td>
      <td className="border-r border-slate-100 px-4 py-4 font-bold text-slate-700">
        {submission.language}
      </td>
      <td className="border-r border-slate-100 px-4 py-4">
        <strong className="block max-w-40 truncate text-xs font-black text-slate-700">
          {entryJudgeNodeLabel(entry)}
        </strong>
        <span className="mt-1 block max-w-40 truncate font-mono text-[11px] font-bold text-slate-400">
          {entry.judge_job?.assigned_node_id ?? '-'}
        </span>
      </td>
      <td className="border-r border-slate-100 px-4 py-4">
        <ContestSubmissionResultBadge
          submission={progressSubmission}
          status={submission.status}
        />
        <span className="mt-1 block text-xs font-bold text-slate-500">
          {submissionProgressText(progressSubmission) || '-'}
        </span>
      </td>
      <td className="border-r border-slate-100 px-4 py-4 font-bold text-slate-700">
        {formatDuration(runtime)}
      </td>
      <td className="border-r border-slate-100 px-4 py-4 font-bold text-slate-700">
        {formatMemory(memory)}
      </td>
      <td className="px-4 py-4 text-center">
        <button
          className="rounded border border-violet-200 bg-white px-3 py-2 text-xs font-black text-violet-700 transition hover:bg-violet-50"
          onClick={onSelect}
          type="button"
        >
          보기
        </button>
      </td>
    </tr>
  );
}

function SubmissionDetailModal({
  entry,
  error,
  isLoading,
  onClose,
}: {
  entry?: AdminJudgeSubmissionEntry;
  error: unknown;
  isLoading: boolean;
  onClose: () => void;
}) {
  const submissionId = entry?.submission.submission_id;

  return (
    <div
      aria-labelledby="admin-submission-detail-title"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 px-4 py-6"
      role="dialog"
    >
      <div className="grid max-h-full w-full max-w-5xl grid-rows-[auto_minmax(0,1fr)] rounded border border-slate-200 bg-white shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="grid gap-1">
            <h2
              className="text-xl font-black text-slate-950"
              id="admin-submission-detail-title"
            >
              제출 상세
            </h2>
            <p className="text-sm font-bold text-slate-500">
              {submissionId ?? '제출 정보를 불러오는 중입니다.'}
            </p>
          </div>
          <button
            className="h-10 rounded border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            닫기
          </button>
        </header>
        <div className="overflow-auto px-6 py-5">
          <SubmissionDetail entry={entry} error={error} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}

function SubmissionDetail({
  entry,
  error,
  isLoading,
}: {
  entry?: AdminJudgeSubmissionEntry;
  error: unknown;
  isLoading: boolean;
}) {
  if (error) {
    return (
      <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
        {formatApiError(error, '제출 상세를 불러오지 못했습니다')}
      </div>
    );
  }

  if (isLoading && !entry) {
    return (
      <p className="rounded border border-slate-200 px-4 py-8 text-center text-sm font-bold text-slate-500">
        불러오는 중입니다.
      </p>
    );
  }

  if (!entry) return null;

  const { submission } = entry;
  const sourceCode = submission.source_code?.trim() || '';
  const detail = parseJudgeDetail(submission.judge_message);
  const runtime =
    submission.runtime_ms ?? submission.time_ms ?? submission.execution_time_ms;
  const memory =
    submission.memory_kb ??
    submission.memory_usage_kb ??
    submission.max_memory_kb;
  const progressSubmission = {
    ...submission,
    queue_position: submission.queue_position,
  };
  const contestDivision = entryContestDivisionLabel(entry);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        <DetailCard label="제출" value={submission.submission_id} />
        <DetailCard label="대회" value={contestDivision.contest} />
        <DetailCard label="유형" value={contestDivision.division} />
        <DetailCard label="에이전트" value={entryJudgeNodeLabel(entry)} />
        <DetailCard label="팀/계정" value={entryOwner(entry)} />
        <DetailCard label="계정 정보" value={entryOwnerDetail(entry)} />
        <DetailCard label="문제" value={entryProblemLabel(entry)} />
        <DetailCard label="결과" value={submissionStatusLabel(submission.status)} />
        <DetailCard label="언어" value={String(submission.language)} />
        <DetailCard
          label="진행"
          value={submissionProgressText(progressSubmission) || '-'}
        />
        <DetailCard label="시간" value={formatDuration(runtime)} />
        <DetailCard label="메모리" value={formatMemory(memory)} />
        <DetailCard
          label="실패 케이스"
          value={String(submission.failed_testcase_order ?? '-')}
        />
        <DetailCard
          label="제출 시각"
          value={formatDateTime(submission.submitted_at)}
        />
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-black text-slate-700">결과</p>
        <ContestSubmissionResultBadge
          submission={progressSubmission}
          status={submission.status}
        />
      </div>

      {submission.compile_message ? (
        <div className="grid gap-2">
          <p className="text-sm font-black text-slate-700">컴파일 메시지</p>
          <pre className="max-h-48 overflow-auto rounded border border-amber-200 bg-amber-50 p-3 text-xs leading-5 font-bold text-amber-900">
            {submission.compile_message}
          </pre>
        </div>
      ) : null}

      <div className="grid gap-2">
        <p className="text-sm font-black text-slate-700">채점 로그</p>
        <pre className="max-h-48 overflow-auto rounded border border-slate-200 bg-slate-950 p-3 text-xs leading-5 font-bold text-slate-50">
          {submission.judge_message || '-'}
        </pre>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <LogBlock label="실패 입력" value={detail.inputText || '-'} />
        <LogBlock label="기대 출력" value={detail.expectedText || '-'} />
        <LogBlock label="실제 출력" value={detail.actualText || '-'} />
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-black text-slate-700">소스 코드</p>
        <pre className="max-h-[560px] overflow-auto rounded border border-slate-800 bg-slate-950 p-4 text-xs leading-5 text-slate-100">
          <code>{sourceCode || '소스 코드가 포함되지 않은 응답입니다.'}</code>
        </pre>
      </div>
    </div>
  );
}

function shortSubmissionId(submissionId: string) {
  return submissionId.split('-')[0] || submissionId.slice(0, 8);
}

function formatDuration(value?: number | null) {
  if (typeof value !== 'number') return '-';
  return `${value} ms`;
}

function formatMemory(value?: number | null) {
  if (typeof value !== 'number') return '-';
  if (value >= 1024) return `${Math.round(value / 102.4) / 10} MB`;
  return `${value} KB`;
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-xs font-black text-slate-500">{label}</span>
      <strong className="text-sm font-black break-words text-slate-950">
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
