import type {
  OperatorScoreboardResponse,
  OperatorPresentationScoreboardResponse,
  ScoreboardResponse,
  Submission,
  SubmissionCreateRequest,
} from '@/domains/submissionScoreboard/types';
import { apiPageRequest, apiRequest } from '@/shared/api/client';

export function createSubmission(
  contestId: string,
  problemId: string,
  token: string,
  body: SubmissionCreateRequest,
) {
  return apiRequest<Submission>(
    `/contests/${contestId}/problems/${problemId}/submissions`,
    token,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export function listSubmissions(
  contestId: string,
  token?: string,
  options: { divisionId?: string } = {},
) {
  const search = new URLSearchParams();
  if (options.divisionId) search.set('division_id', options.divisionId);
  const query = search.toString();

  return apiRequest<Submission[]>(
    `/contests/${contestId}/submissions${query ? `?${query}` : ''}`,
    token,
  );
}

export function listSubmissionsPage(
  contestId: string,
  token: string | undefined,
  options: {
    cursor?: string;
    divisionId?: string;
    includeSource?: boolean;
    limit?: number;
    problemId?: string;
  } = {},
) {
  const search = new URLSearchParams();
  if (options.limit) search.set('limit', String(options.limit));
  if (options.cursor) search.set('cursor', options.cursor);
  if (options.divisionId) search.set('division_id', options.divisionId);
  if (options.includeSource) search.set('include_source', 'true');
  if (options.problemId) search.set('problem_id', options.problemId);

  const query = search.toString();
  return apiPageRequest<Submission[]>(
    `/contests/${contestId}/submissions${query ? `?${query}` : ''}`,
    token,
  );
}

export function getSubmission(
  contestId: string,
  submissionId: string,
  token: string,
) {
  return apiRequest<Submission>(
    `/contests/${contestId}/submissions/${submissionId}`,
    token,
  );
}

export function waitSubmissionStatus(
  contestId: string,
  submissionId: string,
  token: string,
  options: { waitSeconds?: number; pollIntervalSeconds?: number } = {},
) {
  const search = new URLSearchParams({
    wait_seconds: String(options.waitSeconds ?? 4),
    poll_interval_seconds: String(options.pollIntervalSeconds ?? 0.5),
  });

  return apiRequest<Submission>(
    `/contests/${contestId}/submissions/${submissionId}/status:wait?${search}`,
    token,
  );
}

export function createMockSubmission(
  contestId: string,
  problemId: string,
  token: string | undefined,
  body: SubmissionCreateRequest,
) {
  return apiRequest<Submission>(
    `/contests/${contestId}/problems/${problemId}/mock-submissions`,
    token,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export function waitMockSubmissionStatus(
  contestId: string,
  submissionId: string,
  token: string | undefined,
  options: { waitSeconds?: number; pollIntervalSeconds?: number } = {},
) {
  const search = new URLSearchParams({
    wait_seconds: String(options.waitSeconds ?? 1),
    poll_interval_seconds: String(options.pollIntervalSeconds ?? 0.15),
  });

  return apiRequest<Submission>(
    `/contests/${contestId}/mock-submissions/${submissionId}/status:wait?${search}`,
    token,
  );
}

export function getScoreboard(contestId: string, token?: string) {
  return apiRequest<ScoreboardResponse>(
    `/contests/${contestId}/scoreboard`,
    token,
  );
}

export function waitScoreboard(
  contestId: string,
  token: string | undefined,
  options: { waitSeconds?: number; pollIntervalSeconds?: number } = {},
) {
  const search = new URLSearchParams({
    wait_seconds: String(options.waitSeconds ?? 4),
    poll_interval_seconds: String(options.pollIntervalSeconds ?? 0.5),
  });

  return apiRequest<ScoreboardResponse>(
    `/contests/${contestId}/scoreboard:wait?${search}`,
    token,
  );
}

export function getDivisionScoreboard(
  contestId: string,
  divisionId: string,
  token?: string,
) {
  return apiRequest<ScoreboardResponse>(
    `/contests/${contestId}/divisions/${divisionId}/scoreboard`,
    token,
  );
}

export function waitDivisionScoreboard(
  contestId: string,
  divisionId: string,
  token: string | undefined,
  options: { waitSeconds?: number; pollIntervalSeconds?: number } = {},
) {
  const search = new URLSearchParams({
    wait_seconds: String(options.waitSeconds ?? 4),
    poll_interval_seconds: String(options.pollIntervalSeconds ?? 0.5),
  });

  return apiRequest<ScoreboardResponse>(
    `/contests/${contestId}/divisions/${divisionId}/scoreboard:wait?${search}`,
    token,
  );
}

export function listOperatorSubmissions(contestId: string, token: string) {
  return apiRequest<Submission[]>(
    `/operator/contests/${contestId}/submissions`,
    token,
  );
}

export function listOperatorSubmissionsPage(
  contestId: string,
  token: string,
  options: { divisionId?: string; problemId?: string; limit?: number; cursor?: string } = {},
) {
  const search = new URLSearchParams();
  if (options.limit) search.set('limit', String(options.limit));
  if (options.cursor) search.set('cursor', options.cursor);
  if (options.divisionId) search.set('division_id', options.divisionId);
  if (options.problemId) search.set('problem_id', options.problemId);
  const query = search.toString();

  return apiPageRequest<Submission[]>(
    `/operator/contests/${contestId}/submissions${query ? `?${query}` : ''}`,
    token,
  );
}

export function getOperatorSubmission(
  contestId: string,
  submissionId: string,
  token: string,
) {
  return apiRequest<Submission>(
    `/operator/contests/${contestId}/submissions/${submissionId}`,
    token,
  );
}

export function waitOperatorSubmissionStatus(
  contestId: string,
  submissionId: string,
  token: string,
  options: { waitSeconds?: number; pollIntervalSeconds?: number } = {},
) {
  const search = new URLSearchParams({
    wait_seconds: String(options.waitSeconds ?? 4),
    poll_interval_seconds: String(options.pollIntervalSeconds ?? 0.5),
  });

  return apiRequest<Submission>(
    `/operator/contests/${contestId}/submissions/${submissionId}/status:wait?${search}`,
    token,
  );
}

export function getOperatorScoreboard(contestId: string, token: string) {
  return apiRequest<OperatorScoreboardResponse>(
    `/operator/contests/${contestId}/scoreboard/internal`,
    token,
  );
}

export function getOperatorDivisionScoreboard(
  contestId: string,
  divisionId: string,
  token: string,
) {
  return apiRequest<OperatorScoreboardResponse>(
    `/operator/contests/${contestId}/divisions/${divisionId}/scoreboard/internal`,
    token,
  );
}

export function getOperatorPresentationScoreboard(
  contestId: string,
  token: string,
) {
  return apiRequest<OperatorPresentationScoreboardResponse>(
    `/operator/contests/${contestId}/scoreboard/presentation`,
    token,
  );
}

export function listAdminJudgeSubmissionsPage(
  token: string,
  options: { limit?: number; cursor?: string; includeSource?: boolean } = {},
) {
  const search = new URLSearchParams();
  if (options.limit) search.set('limit', String(options.limit));
  if (options.cursor) search.set('cursor', options.cursor);
  search.set('include_source', String(options.includeSource ?? false));

  return apiPageRequest<Submission[]>(
    `/admin/judge/submissions?${search}`,
    token,
  );
}

export function createOperatorTestSubmission(
  contestId: string,
  problemId: string,
  token: string,
  body: SubmissionCreateRequest,
) {
  return apiRequest<Submission>(
    `/operator/contests/${contestId}/problems/${problemId}/test-submissions`,
    token,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export function waitOperatorTestSubmissionStatus(
  contestId: string,
  submissionId: string,
  token: string,
  options: { waitSeconds?: number; pollIntervalSeconds?: number } = {},
) {
  const search = new URLSearchParams({
    wait_seconds: String(options.waitSeconds ?? 1),
    poll_interval_seconds: String(options.pollIntervalSeconds ?? 0.1),
  });

  return apiRequest<Submission>(
    `/operator/contests/${contestId}/test-submissions/${submissionId}/status:wait?${search}`,
    token,
  );
}
