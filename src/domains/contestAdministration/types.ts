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

export type ContestResourceAccess = 'private' | 'participants' | 'public';
export type ScoreboardFreezeMode = 'auto' | 'live' | 'frozen';

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
  problem_access_after_end?: ContestResourceAccess;
  scoring_mode?: ContestFormatType | null;
  scoring_type?: ContestFormatType | null;
  scoreboard_public_after_end: boolean;
  scoreboard_access_after_end?: ContestResourceAccess;
  submission_public_after_end: boolean;
  submission_access_after_end?: ContestResourceAccess;
  board_access_after_end?: ContestResourceAccess;
  board_write_after_end?: boolean;
  notice_access_after_end?: ContestResourceAccess;
  scoreboard_freeze_mode?: ScoreboardFreezeMode;
  mock_judging_enabled?: boolean;
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
    | 'problem_access_after_end'
    | 'scoreboard_access_after_end'
    | 'submission_access_after_end'
    | 'board_access_after_end'
    | 'board_write_after_end'
    | 'notice_access_after_end'
    | 'scoreboard_freeze_mode'
    | 'mock_judging_enabled'
    | 'emergency_notice'
  >
>;
