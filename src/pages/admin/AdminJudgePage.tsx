import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const [cursor, setCursor] = useState<string | undefined>();
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    string | null
  >(null);
  const waitingSubmissionIds = useRef(new Set<string>());

  const dashboardQuery = useQuery({
    queryKey: ['admin', 'judge-dashboard'],
    queryFn: () => getAdminJudgeDashboard(token),
    refetchInterval: isVisible ? 5_000 : false,
  });

  const submissionsQuery = useQuery({
    queryKey: ['admin', 'judge-submissions', cursor ?? 'first'],
    queryFn: () =>
      listAdminJudgeSubmissions(token, {
        cursor,
        includeSource: false,
        limit: 20,
      }),
    refetchInterval: isVisible ? 5_000 : false,
  });

  const selectedSubmissionQuery = useQuery({
    enabled: Boolean(selectedSubmissionId),
    queryKey: ['admin', 'judge-submission', selectedSubmissionId],
    queryFn: () => getAdminJudgeSubmission(selectedSubmissionId!, token, true),
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
  const nextCursor = submissionsQuery.data?.page.next_cursor ?? null;

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
            <div className="flex items-center gap-2">
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
          description="제출번호를 누르면 상세 정보와 소스 코드를 모달로 확인할 수 있습니다."
          title="최근 제출"
        >
          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="w-full min-w-[920px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black text-slate-500">
                <tr>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    제출
                  </th>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    대회
                  </th>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    문제
                  </th>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    팀
                  </th>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    결과
                  </th>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    언어
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3">
                    제출 시각
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(submissionsQuery.data?.data ?? []).length > 0 ? (
                  (submissionsQuery.data?.data ?? []).map((entry) => (
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
                      colSpan={7}
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

  return (
    <tr className={isSelected ? 'bg-violet-50/70' : 'hover:bg-violet-50/40'}>
      <td className="border-r border-slate-100 px-4 py-4">
        <button
          className="text-left font-black text-violet-700 underline-offset-2 hover:underline"
          onClick={onSelect}
          type="button"
        >
          {shortSubmissionId(submission.submission_id)}
        </button>
      </td>
      <td className="border-r border-slate-100 px-4 py-4 font-bold text-slate-700">
        {entry.contest?.title ?? '-'}
      </td>
      <td className="border-r border-slate-100 px-4 py-4">
        <strong className="font-black text-slate-950">
          {entry.problem?.problem_code ?? submission.problem_code ?? '-'}
        </strong>
        <p className="max-w-44 truncate text-xs font-bold text-slate-400">
          {entry.problem?.title ?? submission.problem_title ?? '-'}
        </p>
      </td>
      <td className="border-r border-slate-100 px-4 py-4">
        <p className="max-w-44 truncate font-bold text-slate-700">
          {entry.team?.team_name ?? submission.team_name ?? '-'}
        </p>
        <p className="max-w-44 truncate text-xs font-bold text-slate-400">
          {entry.member?.name ?? submission.member_name ?? '-'}
        </p>
      </td>
      <td className="border-r border-slate-100 px-4 py-4">
        <ContestSubmissionResultBadge
          judgeMessage={submission.judge_message}
          status={submission.status}
        />
      </td>
      <td className="border-r border-slate-100 px-4 py-4 font-bold text-slate-700">
        {submission.language}
      </td>
      <td className="px-4 py-4 font-bold text-slate-500">
        {formatDateTime(submission.submitted_at)}
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

  return (
    <div className="grid gap-4">
      <dl className="grid grid-cols-2 gap-3 rounded border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="grid gap-1">
          <dt className="text-xs font-black text-slate-400">문제</dt>
          <dd className="font-black text-slate-950">
            {entry.problem?.problem_code ?? submission.problem_code ?? '-'}
          </dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-xs font-black text-slate-400">언어</dt>
          <dd className="font-black text-slate-950">{submission.language}</dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-xs font-black text-slate-400">시간</dt>
          <dd className="font-black text-slate-950">
            {formatDuration(submission.execution_time_ms ?? submission.time_ms)}
          </dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-xs font-black text-slate-400">메모리</dt>
          <dd className="font-black text-slate-950">
            {formatMemory(submission.memory_usage_kb ?? submission.memory_kb)}
          </dd>
        </div>
      </dl>

      <div className="grid gap-2">
        <p className="text-sm font-black text-slate-700">결과</p>
        <ContestSubmissionResultBadge
          judgeMessage={submission.judge_message}
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
