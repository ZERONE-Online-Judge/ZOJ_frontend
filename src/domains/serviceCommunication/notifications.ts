import { apiRequest } from '@/shared/api/client';

export type Notification = {
  notification_id: string;
  notification_type: 'notice' | 'answer' | 'submission' | 'rejudging';
  contest_id: string;
  contest_title: string;
  title: string;
  body: string;
  href: string;
  reason: string | null;
  created_at: string;
  read_at: string | null;
  dismissed_at: string | null;
};
export type NotificationPage = {
  items: Notification[];
  next_offset: number | null;
  unread_count: number;
  total_count: number;
};
function search(contestId?: string, offset?: number) {
  const params = new URLSearchParams();
  if (contestId) params.set('contest_id', contestId);
  if (offset) params.set('offset', String(offset));
  return params.size ? `?${params}` : '';
}
export function getNotifications(
  token: string,
  contestId?: string,
  offset = 0,
) {
  return apiRequest<NotificationPage>(
    `/notifications${search(contestId, offset)}`,
    token,
  );
}
export function updateNotification(
  token: string,
  id: string,
  action: 'read' | 'unread' | 'dismiss' | 'delete',
  contestId?: string,
) {
  return apiRequest<{ notification_id: string }>(
    `/notifications/${encodeURIComponent(id)}${action === 'delete' ? '' : `/${action}`}${search(contestId)}`,
    token,
    { method: action === 'delete' ? 'DELETE' : 'POST' },
  );
}
export function readAllNotifications(token: string, contestId?: string) {
  return apiRequest<{ updated_count: number }>(
    `/notifications/read-all${search(contestId)}`,
    token,
    { method: 'POST' },
  );
}
