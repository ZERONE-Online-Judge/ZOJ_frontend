import { apiRequest } from '@/shared/api/client';
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
