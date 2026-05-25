import { type FormEvent, useState } from 'react';
import { useParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import OperationalAuditLogTable from '@/components/audit/OperationalAuditLogTable';
import PageLayout from '@/components/common/PageLayout';
import {
  OperatorAccessGate,
  OperatorPanel,
  OperatorTabs,
} from '@/components/operator/OperatorShell';
import { sharedUiText } from '@/data/uiText';
import { listOperatorOperationalAuditLogs } from '@/domains/auditMonitoring/api';
import { tokenQueryIdentity } from '@/domains/identityAccess/queryIdentity';
import { formatApiError } from '@/shared/api/errors';
import useDocumentVisibility from '@/shared/hooks/useDocumentVisibility';

const AUDIT_LOG_PAGE_SIZE = 50;

export default function OperatorAuditLogsPage() {
  const { contestId } = useParams();

  return (
    <OperatorAccessGate contestId={contestId} permission="contest.view">
      {(session) =>
        contestId ? (
          <OperatorAuditLogsContent
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

function OperatorAuditLogsContent({
  contestId,
  token,
}: {
  contestId: string;
  token: string;
}) {
  const isVisible = useDocumentVisibility();
  const queryIdentity = tokenQueryIdentity(token);
  const [actorDraft, setActorDraft] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>(
    [],
  );

  const auditLogsQuery = useQuery({
    queryKey: [
      'operator',
      'audit-logs',
      contestId,
      actorFilter || 'all-actors',
      cursor ?? 'first',
      queryIdentity,
    ],
    queryFn: () =>
      listOperatorOperationalAuditLogs(contestId, token, {
        actorEmail: actorFilter || undefined,
        cursor,
        limit: AUDIT_LOG_PAGE_SIZE,
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
    setCursor(undefined);
    setCursorHistory([]);
  }

  return (
    <PageLayout
      description="이 대회에서 운영자와 서비스 관리자가 수행한 변경 작업을 확인합니다."
      eyebrow="Operator Audit"
      title="운영 로그"
    >
      <OperatorTabs contestId={contestId} />
      <OperatorPanel
        description="대회 설정, 공지, 게시판, 참가팀, 문제, 채점 관련 변경 작업이 기록됩니다."
        title="대회 작업 기록"
        actions={
          <button
            className="rounded border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            onClick={() => auditLogsQuery.refetch()}
            type="button"
          >
            새로고침
          </button>
        }
      >
        <form
          className="grid gap-3 rounded border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto]"
          onSubmit={applyFilters}
        >
          <input
            className="h-11 rounded border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
            onChange={(event) => setActorDraft(event.target.value)}
            placeholder="계정 이메일로 필터"
            value={actorDraft}
          />
          <button
            className="h-11 rounded bg-indigo-950 px-5 text-sm font-black text-white transition hover:bg-indigo-800"
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
              className="rounded border border-slate-200 px-4 py-2 text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
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
              className="rounded border border-slate-200 px-4 py-2 text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
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
      </OperatorPanel>
    </PageLayout>
  );
}
