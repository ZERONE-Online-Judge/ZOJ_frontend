import type {
  Contest,
  ContestSettingsPatch,
  ContestWorkspace,
  Division,
  OperatorDashboard,
  PublicContestDetail,
  PublicHomeReadModel,
} from '@/domains/contestAdministration/types';
import type { StaffAccount } from '@/domains/identityAccess/types';
import { apiRequest } from '@/shared/api/client';

export function getPublicHome() {
  return apiRequest<PublicHomeReadModel>('/public/home');
}

export function getPublicContests() {
  return apiRequest<Contest[]>('/public/contests');
}

export function getPublicContest(contestId: string) {
  return apiRequest<PublicContestDetail>(`/public/contests/${contestId}`);
}

export function getContestWorkspace(contestId: string, token?: string) {
  return apiRequest<ContestWorkspace>(`/contests/${contestId}/workspace`, token);
}

export function getDivisionWorkspace(contestId: string, divisionId: string, token?: string) {
  return apiRequest<ContestWorkspace>(`/contests/${contestId}/divisions/${divisionId}/workspace`, token);
}

export function getOperatorContests(token: string) {
  return apiRequest<Contest[]>('/operator/contests', token);
}

export function getOperatorContestDashboard(contestId: string, token: string) {
  return apiRequest<OperatorDashboard>(`/operator/contests/${contestId}/dashboard`, token);
}

export function getOperatorDivisions(contestId: string, token: string) {
  return apiRequest<Division[]>(`/operator/contests/${contestId}/divisions`, token);
}

export function createOperatorDivision(
  contestId: string,
  token: string,
  body: Pick<Division, 'name'> & Partial<Pick<Division, 'description'>>,
) {
  return apiRequest<Division>(`/operator/contests/${contestId}/divisions`, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateOperatorDivision(
  contestId: string,
  divisionId: string,
  token: string,
  body: Partial<Pick<Division, 'name' | 'description'>>,
) {
  return apiRequest<Division>(`/operator/contests/${contestId}/divisions/${divisionId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function updateContestSettings(contestId: string, token: string, body: ContestSettingsPatch) {
  return apiRequest<Contest>(`/operator/contests/${contestId}/settings`, token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function listContestOperators(contestId: string, token: string) {
  return apiRequest<StaffAccount[]>(`/operator/contests/${contestId}/operators`, token);
}

export function createContestOperator(
  contestId: string,
  token: string,
  body: { email: string; display_name?: string; permission_overrides?: string[] },
) {
  return apiRequest<StaffAccount>(`/operator/contests/${contestId}/operators`, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateContestOperator(
  contestId: string,
  operatorEmail: string,
  token: string,
  body: { display_name?: string; permission_overrides?: string[] },
) {
  return apiRequest<StaffAccount>(
    `/operator/contests/${contestId}/operators/${encodeURIComponent(operatorEmail)}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  );
}

export function removeContestOperator(contestId: string, operatorEmail: string, token: string) {
  return apiRequest<StaffAccount>(
    `/operator/contests/${contestId}/operators/${encodeURIComponent(operatorEmail)}`,
    token,
    { method: 'DELETE' },
  );
}

export function createAdminContest(
  token: string,
  body: {
    organization_name: string;
    status: string;
    start_at: string;
    operator_email?: string;
    title?: string;
    overview?: string;
  },
) {
  return apiRequest<Contest>('/admin/contests', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getAdminContests(token: string) {
  return apiRequest<Contest[]>('/admin/contests', token);
}

export function assignAdminContestOperator(
  contestId: string,
  token: string,
  body: { email: string; display_name?: string },
) {
  return apiRequest<StaffAccount>(`/admin/contests/${contestId}/operators`, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
