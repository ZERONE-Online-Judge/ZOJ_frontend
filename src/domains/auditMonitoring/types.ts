import type { Contest, Division } from '@/domains/contestAdministration/types';
import type { Submission } from '@/domains/submissionScoreboard/types';
import type { ParticipantTeam, TeamMember } from '@/domains/teamParticipation/types';

export type JudgeStatus = {
  active_node_count: number;
  total_running_jobs: number;
  total_queue_depth: number;
  allocation_policy: string;
};

export type AdminJudgeDashboard = {
  nodes: Array<{
    judge_node_id: string;
    node_name: string;
    total_slots: number;
    free_slots: number;
    running_job_count: number;
    reported_running_job_count?: number | null;
    actual_running_job_count?: number | null;
    running_job_count_mismatch?: boolean | null;
    agent_version?: string | null;
    last_heartbeat_at: string;
    schedulable: boolean;
    is_active: boolean;
    heartbeat_age_seconds: number;
  }>;
  queue: Array<{
    judge_job_id: string;
    submission_id: string;
    contest_id: string;
    division_id: string;
    status: string;
    queue_position: number;
    assigned_node_id?: string | null;
    leased_at?: string | null;
    created_at: string;
  }>;
  queue_stats?: {
    pending_count: number;
    running_count: number;
    succeeded_count: number;
  };
};

export type AdminJudgeNode = AdminJudgeDashboard['nodes'][number];

export type AdminJudgeAgentLog = {
  judge_agent_log_id: string;
  judge_node_id: string;
  node_name: string;
  level: string;
  message: string;
  created_at: string;
};

export type AdminJudgeSubmissionEntry = {
  submission: Submission;
  contest?: Pick<Contest, 'contest_id' | 'title'> | null;
  division?: Pick<Division, 'division_id' | 'name'> | null;
  problem?: {
    problem_id: string;
    problem_code: string;
    title: string;
    time_limit_ms: number;
    memory_limit_mb: number;
    max_score: number;
  } | null;
  team?: Pick<ParticipantTeam, 'participant_team_id' | 'team_name'> | null;
  member?: Pick<TeamMember, 'team_member_id' | 'name' | 'email'> | null;
  judge_job?: {
    judge_job_id: string;
    status: string;
    queue_position: number;
    assigned_node_id?: string | null;
    created_at: string;
  } | null;
  judge_node?: {
    judge_node_id: string;
    node_name: string;
    total_slots: number;
    free_slots: number;
    running_job_count: number;
    reported_running_job_count?: number | null;
    actual_running_job_count?: number | null;
    running_job_count_mismatch?: boolean | null;
    agent_version?: string | null;
    last_heartbeat_at: string;
    schedulable: boolean;
  } | null;
  active_testcase_count: number;
};
