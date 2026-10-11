export type RejudgingNotification = {
  notification_id: string;
  contest_id: string;
  contest_title: string;
  problem_id: string;
  problem_code: string;
  submission_id: string;
  old_status: string;
  new_status: string;
  reason: string;
  created_at: string;
  read_at: string | null;
};

export type RejudgingNotificationPage = {
  items: RejudgingNotification[];
  next_offset: number | null;
};
