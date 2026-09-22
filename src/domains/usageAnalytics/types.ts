export type UsageFilters = {
  start: string;
  end: string;
  contest_id: string;
  service: string;
  audience: string;
};
export type UsageBreakdown = {
  key: string;
  label: string;
  views: number;
  visitors: number;
  active_seconds: number;
};
export type UsageSummary = {
  views: number;
  visitors: number;
  visits: number;
  signed_in_users: number;
  active_seconds: number;
};
export type UsageReport = {
  generated_at: string;
  timezone: string;
  retention_days: number;
  first_event_at: string | null;
  period: { start: string; end: string; interval: 'hour' | 'day' };
  filters: {
    contest_id: string | null;
    service: string | null;
    audience: string;
  };
  summary: UsageSummary & {
    active_visitors: number;
    returning_visitors: number;
    new_visitors: number;
    average_active_seconds: number;
  };
  previous: UsageSummary;
  comparison_available: boolean;
  timeline: {
    period: string;
    views: number;
    visitors: number;
    visits: number;
    future: boolean;
  }[];
  hours: { hour: number; views: number }[];
  heatmap: { weekday: number; hour: number; views: number }[];
  services: UsageBreakdown[];
  pages: UsageBreakdown[];
  audiences: UsageBreakdown[];
  devices: UsageBreakdown[];
  browsers: UsageBreakdown[];
  referrers: UsageBreakdown[];
  contests: {
    contest_id: string;
    title: string;
    views: number;
    visitors: number;
    visits: number;
  }[];
  operations: {
    submissions: number;
    login_successes: number;
    login_failures: number;
    session_conflicts: number;
    operation_failures: number;
    questions: number;
    average_judge_seconds: number | null;
    outcomes: { key: string; count: number }[];
    languages: { key: string; count: number }[];
    submission_kinds: { key: string; count: number }[];
  };
};
