import type {
  JudgeDetail,
  SubmissionProgressState,
} from '@/domains/submissionScoreboard/types';

export const PENDING_SUBMISSION_STATUSES = [
  'waiting',
  'preparing',
  'judging',
] as const;

export function isSubmissionPending(status?: string | null) {
  return PENDING_SUBMISSION_STATUSES.includes(
    status as (typeof PENDING_SUBMISSION_STATUSES)[number],
  );
}

export function isSubmissionTerminal(status?: string | null) {
  return Boolean(status) && !isSubmissionPending(status);
}

export function submissionStatusLabel(status?: string | null) {
  switch (status) {
    case 'waiting':
      return '채점 대기 중';
    case 'preparing':
      return '채점 준비 중';
    case 'judging':
      return '채점 중';
    case 'accepted':
      return '맞았습니다';
    case 'wrong_answer':
      return '틀렸습니다';
    case 'compile_error':
      return '컴파일 에러';
    case 'runtime_error':
      return '런타임 에러';
    case 'time_limit_exceeded':
      return '시간 초과';
    case 'memory_limit_exceeded':
      return '메모리 초과';
    case 'output_limit_exceeded':
      return '출력 초과';
    case 'system_error':
      return '시스템 에러';
    default:
      return status ?? '미제출';
  }
}

export function submissionStatusTone(status?: string | null) {
  switch (status) {
    case 'accepted':
      return 'success';
    case 'runtime_error':
      return 'neutral';
    case 'waiting':
    case 'preparing':
    case 'judging':
      return 'pending';
    case 'wrong_answer':
    case 'compile_error':
    case 'time_limit_exceeded':
    case 'memory_limit_exceeded':
    case 'output_limit_exceeded':
    case 'system_error':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function submissionProgressPercent(
  submission?: SubmissionProgressState | null,
) {
  const status = submission?.status;
  const current = submission?.progress_current;
  const total = submission?.progress_total;

  if (isSubmissionPending(status) && total && total > 0) {
    return Math.max(
      0,
      Math.min(100, Math.round(((current ?? 0) / total) * 100)),
    );
  }

  switch (status) {
    case 'waiting':
      return 0;
    case 'preparing':
      return 35;
    case 'judging':
      return 75;
    case 'accepted':
    case 'wrong_answer':
    case 'compile_error':
    case 'runtime_error':
    case 'time_limit_exceeded':
    case 'memory_limit_exceeded':
    case 'output_limit_exceeded':
    case 'system_error':
      return 100;
    default:
      return null;
  }
}

export function submissionProgressText(
  submission?: SubmissionProgressState | null,
) {
  const status = submission?.status;
  const current = submission?.progress_current;
  const total = submission?.progress_total;
  const percent = submissionProgressPercent(submission);

  if (!isSubmissionPending(status) || percent === null) return '';
  if (total && total > 0) return `${current ?? 0}/${total} · ${percent}%`;
  return `${percent}%`;
}

export function parseJudgeDetail(message?: string | null): JudgeDetail {
  if (!message) {
    return { caseFiles: '', inputText: '', expectedText: '', actualText: '' };
  }

  const caseFiles =
    message.match(/^testcase\s+#\d+\s*\(([^)]+)\):/i)?.[1] ?? '';
  const inputText =
    message.match(/\[input\]\n([\s\S]*?)\n\[expected\]\n/)?.[1]?.trim() ?? '';
  const expectedText =
    message.match(/\[expected\]\n([\s\S]*?)\n\[actual\]\n/)?.[1]?.trim() ?? '';
  const actualText = message.match(/\[actual\]\n([\s\S]*)$/)?.[1]?.trim() ?? '';

  return { caseFiles, inputText, expectedText, actualText };
}
