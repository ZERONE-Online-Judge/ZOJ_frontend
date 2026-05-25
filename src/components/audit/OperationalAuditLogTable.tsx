import type { OperationalAuditLog } from '@/domains/auditMonitoring/types';
import { formatDateTime, formatRelativeTime } from '@/shared/lib/dateTime';

type OperationalAuditLogTableProps = {
  logs: OperationalAuditLog[];
  loading?: boolean;
};

function actorLabel(log: OperationalAuditLog) {
  if (!log.actor_email) return '확인 불가';
  if (!log.actor_name || log.actor_name === log.actor_email) {
    return log.actor_email;
  }
  return `${log.actor_name} · ${log.actor_email}`;
}

function roleLabel(role?: string | null) {
  if (role === 'service_master') return '서비스 마스터';
  if (role === 'operator') return '운영자';
  return '권한 확인 전';
}

function scopeLabel(scope: string) {
  if (scope === 'admin') return '서비스 관리자';
  if (scope === 'operator') return '운영자';
  return scope;
}

function statusClassName(statusCode: number) {
  if (statusCode >= 500) return 'border-rose-200 bg-rose-50 text-rose-700';
  if (statusCode >= 400) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

export default function OperationalAuditLogTable({
  logs,
  loading = false,
}: OperationalAuditLogTableProps) {
  if (loading && logs.length === 0) {
    return (
      <div className="rounded border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">
        운영 로그를 불러오는 중입니다.
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">
        아직 기록된 운영 로그가 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-slate-200">
      <table className="min-w-[980px] divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-normal text-slate-500">
          <tr>
            <th className="px-4 py-3">시간</th>
            <th className="px-4 py-3">누가</th>
            <th className="px-4 py-3">어디서</th>
            <th className="px-4 py-3">무엇을</th>
            <th className="px-4 py-3">결과</th>
            <th className="px-4 py-3">위치</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {logs.map((log) => (
            <tr
              className="align-top transition hover:bg-slate-50"
              key={log.operational_audit_log_id}
            >
              <td className="w-44 px-4 py-4">
                <div className="grid gap-1">
                  <span className="font-black text-slate-900">
                    {formatRelativeTime(log.created_at)}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>
              </td>
              <td className="w-64 px-4 py-4">
                <div className="grid gap-1">
                  <span className="break-words font-black text-slate-900">
                    {actorLabel(log)}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {roleLabel(log.actor_role)}
                  </span>
                </div>
              </td>
              <td className="w-44 px-4 py-4">
                <div className="grid gap-1">
                  <span className="font-black text-slate-900">
                    {scopeLabel(log.scope)}
                  </span>
                  {log.contest_id ? (
                    <code className="break-all text-xs font-bold text-slate-500">
                      {log.contest_id}
                    </code>
                  ) : (
                    <span className="text-xs font-bold text-slate-500">
                      전체 서비스
                    </span>
                  )}
                </div>
              </td>
              <td className="min-w-80 px-4 py-4">
                <div className="grid gap-2">
                  <span className="font-black text-slate-900">
                    {log.action}
                  </span>
                  <code className="break-all rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                    {log.method} {log.path}
                  </code>
                  {typeof log.details?.query === 'string' &&
                  log.details.query ? (
                    <code className="break-all text-xs font-bold text-slate-500">
                      ?{log.details.query}
                    </code>
                  ) : null}
                </div>
              </td>
              <td className="w-24 px-4 py-4">
                <span
                  className={[
                    'inline-flex rounded-full border px-2.5 py-1 text-xs font-black',
                    statusClassName(log.status_code),
                  ].join(' ')}
                >
                  {log.status_code}
                </span>
              </td>
              <td className="w-72 px-4 py-4">
                <div className="grid gap-1 text-xs font-bold text-slate-500">
                  <span className="break-all">{log.client_ip ?? '-'}</span>
                  <span className="break-words">
                    {log.user_agent ?? 'User-Agent 없음'}
                  </span>
                  {log.request_id ? (
                    <code className="break-all text-slate-400">
                      {log.request_id}
                    </code>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
