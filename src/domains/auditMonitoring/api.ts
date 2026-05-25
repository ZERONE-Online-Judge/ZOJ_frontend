import type {
  AdminJudgeAgentLog,
  AdminJudgeDashboard,
  AdminJudgeSubmissionEntry,
  JudgeStatus,
} from '@/domains/auditMonitoring/types';
import type { Submission } from '@/domains/submissionScoreboard/types';
import { apiPageRequest, apiRequest } from '@/shared/api/client';

export function getPublicJudgeStatus() {
  return apiRequest<JudgeStatus>('/public/judge-status');
}

export function getAdminDashboard(token: string) {
  return apiRequest<{
    contest_count: number;
    pending_jobs: number;
    mail_queue_pending: number;
    judge_node_count: number;
    active_judge_node_count?: number;
  }>('/admin/dashboard', token);
}

export function getAdminJudgeDashboard(token: string) {
  return apiRequest<AdminJudgeDashboard>('/admin/judge/dashboard', token);
}

export function listAdminJudgeNodeLogs(
  nodeId: string,
  token: string,
  options: { cursor?: string; limit?: number } = {},
) {
  const search = new URLSearchParams();
  if (options.limit) search.set('limit', String(options.limit));
  if (options.cursor) search.set('cursor', options.cursor);
  return apiPageRequest<AdminJudgeAgentLog[]>(
    `/admin/judge/nodes/${nodeId}/logs?${search}`,
    token,
  );
}

export function listAdminJudgeSubmissions(
  token: string,
  options: {
    contestId?: string;
    cursor?: string;
    divisionId?: string;
    includeSource?: boolean;
    limit?: number;
  } = {},
) {
  const search = new URLSearchParams();
  if (options.contestId) search.set('contest_id', options.contestId);
  if (options.limit) search.set('limit', String(options.limit));
  if (options.cursor) search.set('cursor', options.cursor);
  if (options.divisionId) search.set('division_id', options.divisionId);
  search.set('include_source', String(options.includeSource ?? false));

  return apiPageRequest<AdminJudgeSubmissionEntry[]>(
    `/admin/judge/submissions?${search}`,
    token,
  );
}

export function getAdminJudgeSubmission(
  submissionId: string,
  token: string,
  includeSource = true,
) {
  const search = new URLSearchParams({ include_source: String(includeSource) });
  return apiRequest<AdminJudgeSubmissionEntry>(
    `/admin/judge/submissions/${submissionId}?${search}`,
    token,
  );
}

export function waitAdminJudgeSubmissionStatus(
  submissionId: string,
  token: string,
  options: { waitSeconds?: number; pollIntervalSeconds?: number } = {},
) {
  const search = new URLSearchParams({
    wait_seconds: String(options.waitSeconds ?? 4),
    poll_interval_seconds: String(options.pollIntervalSeconds ?? 0.5),
  });

  return apiRequest<Submission>(
    `/admin/judge/submissions/${submissionId}/status:wait?${search}`,
    token,
  );
}
