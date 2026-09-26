import { serializeProblemDocument } from '@/domains/problemManagement/document';
import type { Contest } from '@/domains/contestAdministration/types';
import type { Problem } from '@/domains/problemManagement/types';
import type { ContestQuestion } from '@/domains/serviceCommunication/types';
import type {
  Submission,
  ScoreboardRow,
} from '@/domains/submissionScoreboard/types';
import type { OperationalAuditLog } from '@/domains/auditMonitoring/types';

export const guideContestId = 'guide-example';
export const guideTime = '2026-09-25T05:00:00Z';
export function guideContest(): Contest {
  const now = Date.now();
  return {
    contest_id: guideContestId,
    title: '예제 대회',
    organization_name: 'ZOJ',
    overview: '가이드 연습용 대회',
    status: 'running',
    visibility: 'public',
    visibility_after_end: 'public',
    start_at: new Date(now - 3600000).toISOString(),
    freeze_at: new Date(now + 600000).toISOString(),
    end_at: new Date(now + 1200000).toISOString(),
    emergency_notice: null,
  };
}
export const guideProblem: Problem = {
  problem_id: 'guide-sum',
  problem_code: 'A',
  title: '두 수의 합',
  time_limit_ms: 1000,
  memory_limit_mb: 256,
  statement: serializeProblemDocument({
    statement: '두 정수 A와 B의 합을 출력하세요.',
    inputDescription: '두 정수 A, B가 주어집니다. (0 ≤ A, B ≤ 100)',
    outputDescription: 'A + B를 출력합니다.',
    note: '',
    examples: [{ input: '2 3', output: '5' }],
  }),
};
export const guideSubmission: Submission = {
  submission_id: 'example-0001',
  problem_id: guideProblem.problem_id,
  problem_code: 'A',
  problem_title: guideProblem.title,
  team_name: '예제팀',
  member_name: '예제 참가자',
  language: 'cpp17',
  status: 'wrong_answer',
  submitted_at: guideTime,
  runtime_ms: 33,
  memory_kb: 584,
  failed_testcase_order: 2,
  source_code:
    '#include <iostream>\nint main() {\n  int a, b; std::cin >> a >> b;\n  std::cout << a - b;\n}\n',
  judge_message:
    'testcase #2: wrong answer\n[input]\n2 3\n[expected]\n5\n[actual]\n-1',
};
export const guideQuestion: ContestQuestion = {
  contest_question_id: 'guide-question',
  title: '입력 범위 질문',
  body: 'A와 B에 같은 값이 들어와도 되나요?',
  visibility: 'public',
  team_name: '예제팀',
  division_name: '일반부',
  author_name: '예제 참가자',
  author_email: 'participant@example.com',
  created_at: guideTime,
  answers: [],
};
export const guideRanks: ScoreboardRow[] = [
  {
    rank: 1,
    team_id: 'lime',
    team_name: '라임',
    division: '일반부',
    solved: 2,
    penalty: 45,
    submission_count: 2,
    problem_scores: [
      {
        problem_code: 'A',
        attempts: 1,
        wrong_attempts: 0,
        solved: true,
        best_status: 'accepted',
        penalty: 20,
      },
      {
        problem_code: 'B',
        attempts: 1,
        wrong_attempts: 0,
        solved: true,
        best_status: 'accepted',
        penalty: 25,
      },
    ],
  },
  {
    rank: 2,
    team_id: 'aurora',
    team_name: '오로라',
    division: '일반부',
    solved: 1,
    penalty: 30,
    submission_count: 1,
    problem_scores: [
      {
        problem_code: 'A',
        attempts: 1,
        wrong_attempts: 0,
        solved: true,
        best_status: 'accepted',
        penalty: 30,
      },
    ],
  },
  {
    rank: 3,
    team_id: 'cobalt',
    team_name: '코발트',
    division: '일반부',
    solved: 1,
    penalty: 60,
    submission_count: 2,
    problem_scores: [
      {
        problem_code: 'A',
        attempts: 2,
        wrong_attempts: 1,
        solved: true,
        best_status: 'accepted',
        penalty: 60,
      },
    ],
  },
];
export const guideAuditLogs: OperationalAuditLog[] = [
  {
    operational_audit_log_id: 'guide-audit-1',
    scope: 'operator',
    method: 'PATCH',
    path: '/api/operator/contests/guide-example/settings',
    action: 'PATCH /operator/contests/{id}/settings',
    status_code: 200,
    actor_name: '예제 운영자',
    actor_email: 'operator@example.com',
    actor_role: 'operator',
    contest_id: guideContestId,
    created_at: guideTime,
    details: {
      contest_title: '예제 대회',
      schema_version: 2,
      change_kind: 'updated',
      changes: [
        { field: 'visibility_after_end', old: 'private', new: 'public' },
      ],
      body: { visibility_after_end: 'public' },
    },
  },
  {
    operational_audit_log_id: 'guide-audit-2',
    scope: 'operator',
    method: 'POST',
    path: '/api/operator/contests/guide-example/problems/guide-sum/verification-tasks',
    action: 'POST /operator/contests/{id}/problems/{id}/verification-tasks',
    status_code: 200,
    actor_name: '예제 운영자',
    actor_email: 'operator@example.com',
    actor_role: 'operator',
    contest_id: guideContestId,
    created_at: guideTime,
    details: {
      contest_title: '예제 대회',
      target: {
        problem_title: '두 수의 합',
        problem_code: 'A',
        original_filename: 'wrong.cpp',
      },
      analysis: { status: 'queued' },
    },
  },
];
