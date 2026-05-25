import type { AccessLog } from '@/domains/auditMonitoring/types';
import { formatDateTime, formatRelativeTime } from '@/shared/lib/dateTime';

type AccessLogTableProps = {
  logs: AccessLog[];
  loading?: boolean;
};

function eventLabel(eventType: string) {
  const labels: Record<string, string> = {
    general_login: '통합 로그인',
    general_refresh: '세션 갱신',
    login_failed: '로그인 실패',
    logout: '로그아웃',
    participant_login: '참가자 로그인',
    participant_session_check: '참가자 세션 확인',
    participant_session_issued: '참가자 세션 발급',
    session_conflict: '중복 세션 감지',
  };
  return labels[eventType] ?? eventType;
}

function eventClassName(eventType: string) {
  if (eventType === 'login_failed') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (eventType === 'session_conflict') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (eventType === 'logout') return 'border-slate-200 bg-slate-50 text-slate-600';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

function accountScopeLabel(scope: string) {
  if (scope === 'participant') return '참가자';
  if (scope === 'general') return '일반 계정';
  return scope;
}

function roleLabel(role?: string | null) {
  if (role === 'service_master') return '서비스 마스터';
  if (role === 'operator') return '운영자';
  if (role === 'participant') return '참가자';
  if (role === 'general') return '일반 계정';
  return '권한 확인 전';
}

function displayAccount(log: AccessLog) {
  const name = log.member_name || log.display_name;
  if (name && log.email) return `${name} · ${log.email}`;
  return name || log.email || '확인 불가';
}

function contestLabel(log: AccessLog) {
  if (!log.contest_id) return '전체 서비스';
  return log.contest_title ? `${log.contest_title}` : log.contest_id;
}

function detailsJson(details?: Record<string, unknown>) {
  if (!details || Object.keys(details).length === 0) return '';
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return '';
  }
}

export default function AccessLogTable({
  logs,
  loading = false,
}: AccessLogTableProps) {
  if (loading && logs.length === 0) {
    return (
      <div className="rounded border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">
        접속 로그를 불러오는 중입니다.
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">
        아직 기록된 접속 로그가 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-slate-200">
      <table className="min-w-[980px] divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-normal text-slate-500">
          <tr>
            <th className="px-4 py-3">시간</th>
            <th className="px-4 py-3">계정</th>
            <th className="px-4 py-3">대회/팀</th>
            <th className="px-4 py-3">접속 내용</th>
            <th className="px-4 py-3">상세</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {logs.map((log) => {
            const detailText = detailsJson(log.details);
            return (
              <tr className="align-top transition hover:bg-slate-50" key={log.access_log_id}>
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
                <td className="w-72 px-4 py-4">
                  <div className="grid gap-1">
                    <span className="break-words font-black text-slate-900">
                      {displayAccount(log)}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {accountScopeLabel(log.account_scope)} · {roleLabel(log.actor_role)}
                    </span>
                  </div>
                </td>
                <td className="w-64 px-4 py-4">
                  <div className="grid gap-1">
                    <span className="break-words font-black text-slate-900">
                      {contestLabel(log)}
                    </span>
                    <span className="break-words text-xs font-bold text-slate-500">
                      {log.team_name || '팀 정보 없음'}
                    </span>
                  </div>
                </td>
                <td className="w-44 px-4 py-4">
                  <span
                    className={[
                      'inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-black',
                      eventClassName(log.event_type),
                    ].join(' ')}
                  >
                    {eventLabel(log.event_type)}
                  </span>
                </td>
                <td className="min-w-[260px] px-4 py-4">
                  <details className="rounded border border-slate-200 bg-slate-50">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-black text-slate-700">
                      자세히 보기
                    </summary>
                    <div className="grid gap-2 border-t border-slate-200 p-3 text-xs font-bold text-slate-600">
                      <span className="break-all">IP: {log.client_ip ?? '-'}</span>
                      <span className="break-words">
                        User-Agent: {log.user_agent ?? '없음'}
                      </span>
                      {log.request_id ? (
                        <code className="break-all text-slate-400">{log.request_id}</code>
                      ) : null}
                      {detailText ? (
                        <pre className="max-h-64 overflow-auto rounded border border-slate-200 bg-white p-3 font-mono text-[11px] leading-5 whitespace-pre-wrap text-slate-700">
                          {detailText}
                        </pre>
                      ) : null}
                    </div>
                  </details>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
