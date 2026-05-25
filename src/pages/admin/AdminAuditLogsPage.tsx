import { type FormEvent, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  AdminAccessGate,
  AdminPanel,
  AdminTabs,
} from '@/components/admin/AdminShell';
import AccessLogTable from '@/components/audit/AccessLogTable';
import OperationalAuditLogTable from '@/components/audit/OperationalAuditLogTable';
import PageLayout from '@/components/common/PageLayout';
import {
  getAdminAccessLogStats,
  listAdminAccessLogs,
  listAdminOperationalAuditLogs,
} from '@/domains/auditMonitoring/api';
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
  const [logType, setLogType] = useState<'operations' | 'access'>('operations');
  const [scopeFilter, setScopeFilter] = useState('');
  const [accessScopeFilter, setAccessScopeFilter] = useState('');
  const [actorDraft, setActorDraft] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [contestDraft, setContestDraft] = useState('');
  const [contestFilter, setContestFilter] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>(
    [],
  );
  const [accessCursor, setAccessCursor] = useState<string | undefined>();
  const [accessCursorHistory, setAccessCursorHistory] = useState<
    Array<string | undefined>
  >([]);

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

  const accessLogsQuery = useQuery({
    queryKey: [
      'admin',
      'access-logs',
      accessScopeFilter || 'all-scopes',
      actorFilter || 'all-accounts',
      contestFilter || 'all-contests',
      accessCursor ?? 'first',
      queryIdentity,
    ],
    queryFn: () =>
      listAdminAccessLogs(token, {
        accountScope: accessScopeFilter || undefined,
        contestId: contestFilter || undefined,
        cursor: accessCursor,
        email: actorFilter || undefined,
        limit: AUDIT_LOG_PAGE_SIZE,
      }),
    enabled: logType === 'access',
    refetchInterval: isVisible && logType === 'access' ? 10_000 : false,
    placeholderData: keepPreviousData,
  });

  const accessStatsQuery = useQuery({
    queryKey: [
      'admin',
      'access-log-stats',
      contestFilter || 'all-contests',
      queryIdentity,
    ],
    queryFn: () =>
      getAdminAccessLogStats(token, {
        contestId: contestFilter || undefined,
      }),
    enabled: logType === 'access',
    refetchInterval: isVisible && logType === 'access' ? 10_000 : false,
  });

  const logs = auditLogsQuery.data?.data ?? [];
  const page = auditLogsQuery.data?.page;
  const nextCursor = page?.next_cursor ?? null;
  const accessLogs = accessLogsQuery.data?.data ?? [];
  const accessPage = accessLogsQuery.data?.page;
  const accessNextCursor = accessPage?.next_cursor ?? null;
  const accessStats = accessStatsQuery.data;

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActorFilter(actorDraft.trim().toLowerCase());
    setContestFilter(contestDraft.trim());
    setCursor(undefined);
    setCursorHistory([]);
    setAccessCursor(undefined);
    setAccessCursorHistory([]);
  }

  return (
    <PageLayout
      description="서비스 관리자와 운영자 페이지에서 발생한 변경 작업을 시간순으로 추적합니다."
      eyebrow="Admin Audit"
      title="운영 로그"
    >
      <AdminTabs />
      <AdminPanel
        description={
          logType === 'operations'
            ? '누가, 언제, 어떤 운영 작업을 수행했는지 핵심 필드 중심으로 보여줍니다.'
            : '누가, 언제, 어떤 환경으로 로그인하거나 세션을 유지했는지 확인합니다.'
        }
        title={logType === 'operations' ? '작업 기록' : '접속 기록'}
        actions={
          <button
            className="rounded border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
            onClick={() =>
              logType === 'operations'
                ? auditLogsQuery.refetch()
                : accessLogsQuery.refetch()
            }
            type="button"
          >
            새로고침
          </button>
        }
      >
        <div className="inline-flex rounded border border-slate-200 bg-slate-50 p-1">
          {[
            ['operations', '작업 로그'],
            ['access', '접속 로그'],
          ].map(([value, label]) => (
            <button
              className={[
                'rounded px-4 py-2 text-sm font-black transition',
                logType === value
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800',
              ].join(' ')}
              key={value}
              onClick={() => setLogType(value as 'operations' | 'access')}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        <form
          className="grid gap-3 rounded border border-slate-200 bg-slate-50 p-4 md:grid-cols-[160px_1fr_1fr_auto]"
          onSubmit={applyFilters}
        >
          {logType === 'operations' ? (
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
          ) : (
            <select
              className="h-11 rounded border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
              onChange={(event) => {
                setAccessScopeFilter(event.target.value);
                setAccessCursor(undefined);
                setAccessCursorHistory([]);
              }}
              value={accessScopeFilter}
            >
              <option value="">전체 계정</option>
              <option value="general">일반 계정</option>
              <option value="participant">참가자</option>
            </select>
          )}
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
        {logType === 'access' && accessStats ? (
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {[
              ['최근 24시간', accessStats.total_count],
              ['성공/유지', accessStats.success_count],
              ['로그인 실패', accessStats.failed_count],
              ['중복 세션', accessStats.conflict_count],
              ['고유 계정', accessStats.unique_account_count],
              ['활성 세션', accessStats.active_session_count],
            ].map(([label, value]) => (
              <div className="rounded border border-slate-200 bg-white px-4 py-3" key={label}>
                <div className="text-xs font-black text-slate-500">{label}</div>
                <div className="mt-1 text-xl font-black text-slate-900">
                  {Number(value).toLocaleString('ko-KR')}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {logType === 'operations' && auditLogsQuery.error ? (
          <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
            {formatApiError(auditLogsQuery.error, '운영 로그를 불러오지 못했습니다')}
          </div>
        ) : null}
        {logType === 'access' && accessLogsQuery.error ? (
          <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
            {formatApiError(accessLogsQuery.error, '접속 로그를 불러오지 못했습니다')}
          </div>
        ) : null}
        {logType === 'operations' ? (
          <OperationalAuditLogTable
            loading={auditLogsQuery.isFetching}
            logs={logs}
          />
        ) : (
          <AccessLogTable
            loading={accessLogsQuery.isFetching}
            logs={accessLogs}
          />
        )}
        <footer className="flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-slate-500">
          {logType === 'operations' ? (
            <span>
              전체 {page?.total_count ?? logs.length}건 중 {logs.length}건 표시
            </span>
          ) : (
            <span>
              전체 {accessPage?.total_count ?? accessLogs.length}건 중{' '}
              {accessLogs.length}건 표시
            </span>
          )}
          <div className="flex gap-2">
            <button
              className="rounded border border-slate-200 px-4 py-2 text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                logType === 'operations'
                  ? cursorHistory.length === 0
                  : accessCursorHistory.length === 0
              }
              onClick={() => {
                if (logType === 'operations') {
                  const previous = [...cursorHistory];
                  const next = previous.pop();
                  setCursor(next);
                  setCursorHistory(previous);
                  return;
                }
                const previous = [...accessCursorHistory];
                const next = previous.pop();
                setAccessCursor(next);
                setAccessCursorHistory(previous);
              }}
              type="button"
            >
              이전
            </button>
            <button
              className="rounded border border-slate-200 px-4 py-2 text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={logType === 'operations' ? !nextCursor : !accessNextCursor}
              onClick={() => {
                if (logType === 'operations') {
                  setCursorHistory((history) => [...history, cursor]);
                  setCursor(nextCursor ?? undefined);
                  return;
                }
                setAccessCursorHistory((history) => [...history, accessCursor]);
                setAccessCursor(accessNextCursor ?? undefined);
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
