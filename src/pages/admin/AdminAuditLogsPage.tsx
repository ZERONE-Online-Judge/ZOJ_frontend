import { type FormEvent, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  AdminAccessGate,
  AdminPanel,
  AdminTabs,
} from '@/components/admin/AdminShell';
import OperationalAuditLogTable from '@/components/audit/OperationalAuditLogTable';
import PageLayout from '@/components/common/PageLayout';
import { listAdminOperationalAuditLogs } from '@/domains/auditMonitoring/api';
import { tokenQueryIdentity } from '@/domains/identityAccess/queryIdentity';
import { formatApiError } from '@/shared/api/errors';
import useDocumentVisibility from '@/shared/hooks/useDocumentVisibility';

const AUDIT_LOG_PAGE_SIZE = 50;

export default function AdminAuditLogsPage() {
  return (
    <AdminAccessGate>
      {(session) => <AdminAuditLogsContent token={session.accessToken} />}
    </AdminAccessGate>
  );
}

function AdminAuditLogsContent({ token }: { token: string }) {
  const isVisible = useDocumentVisibility();
  const queryIdentity = tokenQueryIdentity(token);
  const [scopeFilter, setScopeFilter] = useState('');
  const [actorDraft, setActorDraft] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [contestDraft, setContestDraft] = useState('');
  const [contestFilter, setContestFilter] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>(
    [],
  );

  const auditLogsQuery = useQuery({
    queryKey: [
      'admin',
      'audit-logs',
      scopeFilter || 'all-scopes',
      actorFilter || 'all-actors',
      contestFilter || 'all-contests',
      cursor ?? 'first',
      queryIdentity,
    ],
    queryFn: () =>
      listAdminOperationalAuditLogs(token, {
        actorEmail: actorFilter || undefined,
        contestId: contestFilter || undefined,
        cursor,
        limit: AUDIT_LOG_PAGE_SIZE,
        scope: scopeFilter || undefined,
      }),
    refetchInterval: isVisible ? 10_000 : false,
    placeholderData: keepPreviousData,
  });

  const logs = auditLogsQuery.data?.data ?? [];
  const page = auditLogsQuery.data?.page;
  const nextCursor = page?.next_cursor ?? null;

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActorFilter(actorDraft.trim().toLowerCase());
    setContestFilter(contestDraft.trim());
    setCursor(undefined);
    setCursorHistory([]);
  }

  return (
    <PageLayout
      description="서비스 관리자와 운영자 페이지에서 발생한 변경 작업을 시간순으로 추적합니다."
      eyebrow="Admin Audit"
      title="운영 로그"
    >
      <AdminTabs />
      <AdminPanel
        description="누가, 어디서, 언제, 어떤 요청을 했고 어떤 결과가 나왔는지 기록합니다."
        title="작업 기록"
        actions={
          <button
            className="rounded border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
            onClick={() => auditLogsQuery.refetch()}
            type="button"
          >
            새로고침
          </button>
        }
      >
        <form
          className="grid gap-3 rounded border border-slate-200 bg-slate-50 p-4 md:grid-cols-[160px_1fr_1fr_auto]"
          onSubmit={applyFilters}
        >
          <select
            className="h-11 rounded border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
            onChange={(event) => {
              setScopeFilter(event.target.value);
              setCursor(undefined);
              setCursorHistory([]);
            }}
            value={scopeFilter}
          >
            <option value="">전체 범위</option>
            <option value="admin">서비스 관리자</option>
            <option value="operator">운영자</option>
          </select>
          <input
            className="h-11 rounded border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
            onChange={(event) => setActorDraft(event.target.value)}
            placeholder="계정 이메일"
            value={actorDraft}
          />
          <input
            className="h-11 rounded border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
            onChange={(event) => setContestDraft(event.target.value)}
            placeholder="대회 ID"
            value={contestDraft}
          />
          <button
            className="h-11 rounded bg-violet-950 px-5 text-sm font-black text-white transition hover:bg-violet-800"
            type="submit"
          >
            필터 적용
          </button>
        </form>
        {auditLogsQuery.error ? (
          <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
            {formatApiError(auditLogsQuery.error, '운영 로그를 불러오지 못했습니다')}
          </div>
        ) : null}
        <OperationalAuditLogTable
          loading={auditLogsQuery.isFetching}
          logs={logs}
        />
        <footer className="flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-slate-500">
          <span>
            전체 {page?.total_count ?? logs.length}건 중 {logs.length}건 표시
          </span>
          <div className="flex gap-2">
            <button
              className="rounded border border-slate-200 px-4 py-2 text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={cursorHistory.length === 0}
              onClick={() => {
                const previous = [...cursorHistory];
                const next = previous.pop();
                setCursor(next);
                setCursorHistory(previous);
              }}
              type="button"
            >
              이전
            </button>
            <button
              className="rounded border border-slate-200 px-4 py-2 text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!nextCursor}
              onClick={() => {
                setCursorHistory((history) => [...history, cursor]);
                setCursor(nextCursor ?? undefined);
              }}
              type="button"
            >
              다음
            </button>
          </div>
        </footer>
      </AdminPanel>
    </PageLayout>
  );
}
