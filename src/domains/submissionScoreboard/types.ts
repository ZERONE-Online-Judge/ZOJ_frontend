import type { Division } from '@/domains/contestAdministration/types';

export type JudgeLanguage = 'c99' | 'cpp17' | 'python313' | 'java8';

export type Submission = {
  submission_id: string;
  problem_id: string;
  problem_code?: string;
  problem_title?: string;
  division_id?: string;
  language: JudgeLanguage | string;
  status: string;
  submitted_at: string;
  memory_kb?: number | null;
  memory_usage_kb?: number | null;
  max_memory_kb?: number | null;
  time_ms?: number | null;
  execution_time_ms?: number | null;
  runtime_ms?: number | null;
  code_length_bytes?: number | null;
  source_code_length?: number | null;
  source_code?: string;
  compile_message?: string | null;
  judge_message?: string | null;
  failed_testcase_order?: number | null;
  progress_current?: number | null;
  progress_total?: number | null;
  progress_percent?: number | null;
  queue_position?: number | null;
  participant_team_id?: string;
  team_member_id?: string;
  team_name?: string | null;
  member_name?: string | null;
  member_email?: string | null;
  problem?: {
    problem_id: string;
    problem_code: string;
    title: string;
  } | null;
  team?: {
    team_name: string;
  } | null;
  member?: {
    name: string;
    email?: string;
  } | null;
};

export type SubmissionProgressState = Pick<
  Submission,
  | 'status'
  | 'progress_current'
  | 'progress_total'
  | 'progress_percent'
  | 'queue_position'
> &
  Pick<Partial<Submission>, 'submitted_at'>;

export type SubmissionCreateRequest = {
  language: JudgeLanguage;
  source_code: string;
};

export type ScoreboardProblemScore = {
  problem_id?: string;
  problem_code: string;
  attempts: number;
  wrong_attempts: number;
  solved: boolean;
  penalty?: number | null;
  solved_at?: string | null;
  best_submission_id?: string;
  best_submitted_at?: string;
  best_status: string | null;
};

export type ScoreboardProblemStat = {
  problem_id: string;
  problem_code: string;
  total_submissions: number;
  accepted_submissions: number;
  accepted_team_count: number;
  acceptance_rate: number | null;
  first_accepted_team_id?: string | null;
  first_accepted_team_name?: string | null;
  first_accepted_at?: string | null;
  first_accepted_elapsed_minutes?: number | null;
};

export type ScoreboardRow = {
  rank: number;
  team_id?: string;
  team_name: string;
  division: string | null;
  division_id?: string;
  solved: number;
  penalty?: number | null;
  submission_count: number;
  last_improved_at?: string | null;
  last_solved_at?: string | null;
  problem_scores: ScoreboardProblemScore[];
};

export type ScoreboardResponse = {
  division: Division;
  frozen: boolean;
  problem_stats?: ScoreboardProblemStat[];
  rows: ScoreboardRow[];
};

export type OperatorScoreboardResponse = {
  frozen_public_view: boolean;
  operator_live_view: boolean;
  problem_stats?: ScoreboardProblemStat[];
  rows: (ScoreboardRow & { visible_to_team?: boolean })[];
};

export type OperatorPresentationScoreboardSection = {
  division: Division;
  frozen: boolean;
  problems: {
    problem_id: string;
    division_id?: string;
    problem_code: string;
    title: string;
    display_order?: number;
  }[];
  rows: ScoreboardRow[];
};

export type OperatorPresentationScoreboardResponse = {
  contest: {
    contest_id: string;
    title: string;
    start_at: string;
    end_at: string;
    freeze_at: string;
    scoreboard_freeze_mode?: string | null;
  };
  sections: OperatorPresentationScoreboardSection[];
};

export type JudgeDetail = {
  caseFiles: string;
  inputText: string;
  expectedText: string;
  actualText: string;
};
