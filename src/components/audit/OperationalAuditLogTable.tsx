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

function detailString(
  details: Record<string, unknown> | undefined,
  key: string,
) {
  const value = details?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function contestLabel(log: OperationalAuditLog) {
  const title = detailString(log.details, 'contest_title');
  if (!log.contest_id) return '전체 서비스';
  return title ? `${title} · ${shortId(log.contest_id)}` : shortId(log.contest_id);
}

function shortId(value: string) {
  return value.length > 12 ? `${value.slice(0, 8)}...` : value;
}

function statusClassName(statusCode: number) {
  if (statusCode >= 500) return 'border-rose-200 bg-rose-50 text-rose-700';
  if (statusCode >= 400) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

function statusLabel(statusCode: number) {
  if (statusCode >= 500) return `${statusCode} 실패`;
  if (statusCode >= 400) return `${statusCode} 거부`;
  return `${statusCode} 성공`;
}

function actionLabel(log: OperationalAuditLog) {
  const path = log.path;
  const method = log.method.toUpperCase();

  if (path.includes('/audit-logs')) return '운영 로그 조회';
  if (path.includes('/settings')) return '대회 설정 변경';
  if (path.includes('/divisions')) {
    if (method === 'POST') return '참가 유형 생성';
    if (method === 'PATCH') return '참가 유형 수정';
  }
  if (path.includes('/operators')) {
    if (method === 'POST') return '운영자 추가';
    if (method === 'PATCH') return '운영자 권한 변경';
    if (method === 'DELETE') return '운영자 제거';
  }
  if (path.includes('/notices')) {
    if (method === 'POST') return '공지 작성';
    if (method === 'PATCH') return '공지 수정';
    if (method === 'DELETE') return '공지 삭제';
  }
  if (path.includes('/service-notices')) {
    if (method === 'POST') return '서비스 공지 작성';
    if (method === 'PATCH') return '서비스 공지 수정';
    if (method === 'DELETE') return '서비스 공지 삭제';
  }
  if (path.includes('/boards/') && path.includes('/answers')) {
    if (method === 'POST') return '게시판 답변 작성';
    if (method === 'PATCH') return '게시판 답변 수정';
    if (method === 'DELETE') return '게시판 답변 삭제';
  }
  if (path.includes('/boards/')) {
    if (method === 'PATCH') return '게시글 공개 상태 변경';
    if (method === 'DELETE') return '게시글 삭제';
  }
  if (path.includes('/participants:bulk-create')) return '참가팀 일괄 등록';
  if (path.includes('/participants/')) {
    if (path.includes('/members/') && path.includes('/sessions:revoke')) {
      return '참가자 세션 해제';
    }
    if (path.includes('/members/')) {
      if (method === 'PATCH') return '참가자 정보 수정';
    }
    if (path.includes('/members')) {
      if (method === 'POST') return '참가자 추가';
    }
    if (method === 'PATCH') return '참가팀 정보 수정';
    if (method === 'DELETE') return '참가팀 삭제';
  }
  if (path.includes('/participants')) {
    if (method === 'POST') return '참가팀 등록';
  }
  if (path.includes('/test-submissions')) return '검증 제출 실행';
  if (path.includes('/problems:copy')) return '문제 복사';
  if (path.includes('/verified-testcase-sets')) return '테스트케이스 검증 등록';
  if (path.includes('/testcase-sets') && path.includes('/testcases')) {
    if (method === 'POST') return '테스트케이스 추가';
    if (method === 'DELETE') return '테스트케이스 삭제';
  }
  if (path.includes('/testcase-sets')) {
    if (method === 'POST') return '테스트케이스 세트 생성';
    if (method === 'PATCH') return '테스트케이스 세트 수정';
    if (method === 'DELETE') return '테스트케이스 세트 삭제';
  }
  if (path.includes('/assets')) {
    if (method === 'POST') return '문제 파일 등록';
    if (method === 'DELETE') return '문제 파일 삭제';
  }
  if (path.includes('/package-builds')) return '채점 패키지 빌드';
  if (path.includes('/problems')) {
    if (method === 'POST') return '문제 생성';
    if (method === 'PATCH') return '문제 수정';
  }
  if (path.includes('/contact-inquiries') && path.includes('/answer')) {
    return '문의 답변 작성';
  }
  if (path.includes('/contests') && method === 'POST') return '대회 생성';

  return log.action;
}

function fieldLabel(field: string) {
  const labels: Record<string, string> = {
    answer_body: '답변',
    board_access_after_end: '대회 종료 후 게시판 공개',
    board_write_after_end: '대회 종료 후 질문/답변 작성',
    body: '본문',
    content: '내용',
    description: '설명',
    display_order: '정렬 순서',
    division_id: '참가 유형',
    email: '이메일',
    end_at: '마감 시간',
    freeze_at: '스코어보드 프리즈',
    is_active: '활성 상태',
    max_score: '최대 점수',
    memory_limit_mb: '메모리 제한',
    mock_judging_enabled: '모의채점',
    mock_judging_progress_visible: '모의채점 진행률 표시',
    name: '이름',
    participant_progress_visible: '참가자 진행률 표시',
    problem_access_after_end: '대회 종료 후 문제 공개',
    problem_code: '문제 번호',
    scoreboard_access_after_end: '대회 종료 후 스코어보드 공개',
    scoreboard_freeze_mode: '스코어보드 프리즈 방식',
    source_problem_id: '복사 원본 문제',
    start_at: '시작 시간',
    statement: '문제 본문',
    status: '상태',
    submission_access_after_end: '대회 종료 후 제출 공개',
    target_division_id: '복사 대상 유형',
    team_name: '팀명',
    time_limit_ms: '시간 제한',
    title: '제목',
    visibility: '공개 상태',
  };
  return labels[field] ?? field;
}

function valueLabel(value: unknown) {
  if (value === null || value === undefined) return '비어 있음';
  if (typeof value === 'boolean') return value ? '켜짐' : '꺼짐';
  if (typeof value === 'string') return value || '빈 문자열';
  if (typeof value === 'number') return value.toLocaleString('ko-KR');
  if (Array.isArray(value)) return `${value.length.toLocaleString('ko-KR')}개 항목`;
  if (typeof value === 'object') return '상세 값';
  return String(value);
}

function auditChanges(details?: Record<string, unknown>) {
  const changes = details?.changes;
  if (!Array.isArray(changes)) return [];
  return changes
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const field = typeof record.field === 'string' ? record.field : '';
      if (!field) return null;
      return { field, hasOld: 'old' in record, oldValue: record.old, value: record.new };
    })
    .filter(
      (
        item,
      ): item is {
        field: string;
        hasOld: boolean;
        oldValue: unknown;
        value: unknown;
      } => Boolean(item),
    );
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
      <table className="min-w-[1120px] divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-normal text-slate-500">
          <tr>
            <th className="px-4 py-3">시간</th>
            <th className="px-4 py-3">누가</th>
            <th className="px-4 py-3">대회</th>
            <th className="px-4 py-3">작업 내용</th>
            <th className="px-4 py-3">결과</th>
            <th className="px-4 py-3">위치</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {logs.map((log) => {
            const changes = auditChanges(log.details);
            return (
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
                <td className="w-56 px-4 py-4">
                  <div className="grid gap-1">
                    <span className="break-words font-black text-slate-900">
                      {contestLabel(log)}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {scopeLabel(log.scope)}
                    </span>
                    {log.contest_id ? (
                      <code className="break-all text-xs font-bold text-slate-400">
                        {log.contest_id}
                      </code>
                    ) : null}
                  </div>
                </td>
                <td className="min-w-[360px] px-4 py-4">
                  <div className="grid gap-2">
                    <span className="font-black text-slate-900">
                      {actionLabel(log)}
                    </span>
                    {changes.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {changes.slice(0, 8).map((change) => (
                          <span
                            className="max-w-full rounded border border-indigo-100 bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-800"
                            key={change.field}
                          >
                            {fieldLabel(change.field)}:{' '}
                            {change.hasOld ? `${valueLabel(change.oldValue)} -> ` : ''}
                            {valueLabel(change.value)}
                          </span>
                        ))}
                        {changes.length > 8 ? (
                          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-500">
                            외 {changes.length - 8}개
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-500">
                        세부 변경값 없음
                      </span>
                    )}
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
                <td className="w-28 px-4 py-4">
                  <span
                    className={[
                      'inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-black',
                      statusClassName(log.status_code),
                    ].join(' ')}
                  >
                    {statusLabel(log.status_code)}
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
