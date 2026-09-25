import { apiRequest, apiBlobRequest } from '@/shared/api/client';
import type { ProblemAsset } from './types';
import type { Submission } from '@/domains/submissionScoreboard/types';
import type { VerificationCodeKind } from './useVerificationCodeRuns';

export type VerificationReport = {
  summary: string;
  verdict_assessment: string;
  causes: {
    title: string;
    confidence: 'high' | 'medium' | 'low';
    evidence: string;
    explanation: string;
    code_reference: string;
  }[];
  fixes: {
    title: string;
    change: string;
    code_example: string;
    verification: string;
  }[];
  suggested_tests: {
    input: string;
    expected_output: string;
    explanation: string;
  }[];
  limitations: string[];
};
export type VerificationAnalysis = {
  engine_version?: number;
  phase?: string | null;
  calls?: number;
  tool_count?: number;
  limits?: { max_cost_usd: number; max_runs: number } | null;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    estimated_cost_usd: number;
    by_model?: Record<string, { calls: number }>;
  } | null;
  trace?: { tool: string; status: string; detail: string; at: string }[];
  files_read?: {
    file_id: string;
    offset?: number;
    complete?: boolean;
    image_attached?: boolean;
  }[];
  artifacts?: {
    artifact_id: string;
    source: string;
    language: string;
    sha256: string;
  }[];
  executions?: {
    submission_id: string;
    artifact_id: string;
    scope: 'all' | 'selected' | 'probe';
    probe?: {
      input: string;
      expected_output: string;
      expected_output_source: string;
      validator_checked: boolean;
    } | null;
    testcase_orders: number[] | null;
    testcase_count: number;
    status: string;
    failed_testcase_order: number | null;
    runtime_ms: number | null;
    memory_kb: number | null;
    agent_version: string | null;
    judge_message: string;
    compile_message: string;
  }[];
  workspace_files?: { path: string; bytes: number; sha256: string }[];
  playground_runs?: {
    request_id: string;
    command: string;
    exit_code: number | null;
    timed_out: boolean;
    stdout: string;
    output_truncated: boolean;
    wall_ms: number;
    notes: string[];
    files: { path: string; bytes: number }[];
  }[];
  analysis_id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  model: string;
  created_at: string;
  completed_at?: string | null;
  error_message?: string | null;
  report?: VerificationReport | null;
  coverage?: {
    total_testcases: number;
    full_testcases: number;
    partial_testcases: number;
    omitted_testcases: number;
    partial: boolean;
    testcase_version: number | null;
    notes: string[];
    files: {
      filename: string;
      included: boolean;
      complete: boolean;
      note: string | null;
    }[];
  } | null;
};
export type SavedVerificationRuns = {
  available: boolean;
  model: string;
  runs: {
    asset_id: string;
    asset: ProblemAsset;
    expected_status: VerificationCodeKind;
    submission: Submission;
    stale: boolean;
    analysis: VerificationAnalysis | null;
  }[];
};
const base = (contestId: string, problemId: string) =>
  `/operator/contests/${contestId}/problems/${problemId}/verification-runs`;
export function listVerificationRuns(
  contestId: string,
  problemId: string,
  token: string,
) {
  return apiRequest<SavedVerificationRuns>(base(contestId, problemId), token);
}
export function getVerificationAnalysis(
  contestId: string,
  problemId: string,
  submissionId: string,
  token: string,
) {
  return apiRequest<{
    available: boolean;
    analysis: VerificationAnalysis | null;
  }>(`${base(contestId, problemId)}/${submissionId}/analysis`, token);
}
export function requestVerificationAnalysis(
  contestId: string,
  problemId: string,
  submissionId: string,
  token: string,
) {
  return apiRequest<{
    available: boolean;
    analysis: VerificationAnalysis | null;
  }>(`${base(contestId, problemId)}/${submissionId}/analysis`, token, {
    method: 'POST',
  });
}

export function downloadVerificationWorkspace(
  contestId: string,
  problemId: string,
  submissionId: string,
  token: string,
) {
  return apiBlobRequest(
    `${base(contestId, problemId)}/${submissionId}/workspace.zip`,
    token,
  );
}
