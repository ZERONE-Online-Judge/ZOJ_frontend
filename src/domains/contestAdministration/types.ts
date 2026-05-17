export type ContestStatus =
  | 'draft'
  | 'schedule_tbd'
  | 'scheduled'
  | 'open'
  | 'running'
  | 'ended'
  | 'finalized'
  | 'archived';

export type ContestFormatType =
  | 'wa_ac'
  | 'wa/ac'
  | 'acm'
  | 'icpc'
  | 'score'
  | 'scored'
  | 'score_based'
  | 'points'
  | 'ioi'
  | string;

export type Contest = {
  contest_id: string;
  title: string;
  organization_name: string;
  overview: string;
  status: ContestStatus | string;
  contest_type?: ContestFormatType | null;
  start_at: string;
  end_at: string;
  freeze_at: string;
  format?: ContestFormatType | null;
  format_type?: ContestFormatType | null;
  problem_public_after_end: boolean;
  scoring_mode?: ContestFormatType | null;
  scoring_type?: ContestFormatType | null;
  scoreboard_public_after_end: boolean;
  submission_public_after_end: boolean;
  emergency_notice: string | null;
};

export type Division = {
  division_id: string;
  code: string;
  name: string;
  description: string;
  display_order?: number;
};

export type PublicHomeReadModel = {
  hero?: unknown;
  active_contest_count?: number;
  emergency_notice?: string | null;
};

export type PublicContestDetail = {
  contest: Contest;
  divisions: Division[];
};

export type ContestWorkspace = {
  contest: Contest;
  division: Division;
  divisions?: Division[];
  problems: unknown[];
  emergency_notice?: string | null;
};

export type PublicVisibility = {
  problems: boolean;
  scoreboard: boolean;
  submissions: boolean;
};

export type OperatorDashboard = {
  contest: Contest;
  divisions: Division[];
  participant_count: number;
  submission_count: number;
  pending_jobs: number;
  participant_count_by_division: Record<string, number>;
};

export type ContestSettingsPatch = Partial<
  Pick<
    Contest,
    | 'title'
    | 'organization_name'
    | 'overview'
    | 'status'
    | 'start_at'
    | 'end_at'
    | 'freeze_at'
    | 'problem_public_after_end'
    | 'scoreboard_public_after_end'
    | 'submission_public_after_end'
    | 'emergency_notice'
  >
>;
