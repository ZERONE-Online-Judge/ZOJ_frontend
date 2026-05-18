import type {
  ContestAnswer,
  ContestNotice,
  ContestQuestion,
  ServiceNotice,
} from '@/domains/serviceCommunication/types';
import { apiRequest } from '@/shared/api/client';

export function getPublicServiceNotices() {
  return apiRequest<ServiceNotice[]>('/public/service-notices');
}

export function getPublicServiceNotice(noticeId: string) {
  return apiRequest<ServiceNotice>(`/public/service-notices/${noticeId}`);
}

export function listAdminServiceNotices(token: string) {
  return apiRequest<ServiceNotice[]>('/admin/service-notices', token);
}

export function createAdminServiceNotice(
  token: string,
  body: Pick<ServiceNotice, 'title' | 'summary' | 'body'> & Partial<Pick<ServiceNotice, 'emergency'>>,
) {
  return apiRequest<ServiceNotice>('/admin/service-notices', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listOperatorContestNotices(contestId: string, token: string) {
  return apiRequest<ContestNotice[]>(`/operator/contests/${contestId}/notices`, token);
}

export function getContestNotices(contestId: string, token?: string) {
  return apiRequest<ContestNotice[]>(`/contests/${contestId}/notices`, token);
}

export function createContestNotice(
  contestId: string,
  token: string,
  body: Pick<ContestNotice, 'title' | 'body'> &
    Partial<Pick<ContestNotice, 'pinned' | 'emergency' | 'visibility'>>,
) {
  return apiRequest<ContestNotice>(`/operator/contests/${contestId}/notices`, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateContestNotice(
  contestId: string,
  noticeId: string,
  token: string,
  body: Partial<Pick<ContestNotice, 'title' | 'body' | 'pinned' | 'emergency' | 'visibility'>>,
) {
  return apiRequest<ContestNotice>(`/operator/contests/${contestId}/notices/${noticeId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function getContestQuestions(contestId: string, token?: string) {
  return apiRequest<ContestQuestion[]>(`/contests/${contestId}/boards`, token);
}

export function listOperatorContestQuestions(contestId: string, token: string) {
  return apiRequest<ContestQuestion[]>(
    `/operator/contests/${contestId}/boards`,
    token,
  );
}

export function createContestQuestion(
  contestId: string,
  token: string,
  body: Pick<ContestQuestion, 'title' | 'body' | 'visibility'> & { problem_id?: string | null },
) {
  return apiRequest<ContestQuestion>(`/contests/${contestId}/boards`, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function createContestAnswer(
  contestId: string,
  questionId: string,
  token: string,
  body: Pick<ContestAnswer, 'body' | 'visibility'>,
) {
  return apiRequest<ContestAnswer>(`/operator/contests/${contestId}/boards/${questionId}/answers`, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
