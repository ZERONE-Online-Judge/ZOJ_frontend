import {
  saveParticipantSession,
} from '@/domains/identityAccess/sessionStorage';
import type {
  ParticipantBulkImportResponse,
  ParticipantOtpRequestResponse,
  ParticipantSession,
  ParticipantSessionApi,
  ParticipantTeam,
  TeamImportRow,
  TeamMember,
  TeamMemberDraft,
} from '@/domains/teamParticipation/types';
import { apiRequest } from '@/shared/api/client';
import { ApiClientError, formatApiError } from '@/shared/api/errors';

export function formatParticipantTeamError(error: unknown, fallback: string) {
  if (error instanceof ApiClientError) {
    const field = typeof error.details?.field === 'string' ? error.details.field : '';
    if (error.code === 'validation_error' && field === 'email_conflict') {
      if (error.message.startsWith('participant email already registered:')) {
        return `${error.message} (이미 다른 참가팀의 팀장/팀원으로 등록된 이메일입니다.)`;
      }
      if (error.message.startsWith('participant email cannot be operator/staff account:')) {
        return `${error.message} (운영자/서비스 관리자 계정 이메일은 참가팀으로 등록할 수 없습니다.)`;
      }
      return `${error.message} (팀장/팀원 이메일 중복 또는 권한 충돌이 있습니다.)`;
    }

    return formatApiError(error, fallback);
  }

  return fallback;
}

function toParticipantSession(contestId: string, data: ParticipantSessionApi): ParticipantSession {
  return {
    accessToken: data.access_token,
    contestId,
    team: data.team,
    member: data.member,
    division: data.division,
  };
}

export async function requestParticipantOtp(contestId: string, email: string) {
  return apiRequest<ParticipantOtpRequestResponse>(
    `/contests/${contestId}/participant-login/otp/request`,
    undefined,
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    },
  );
}

export async function verifyParticipantOtp(
  contestId: string,
  email: string,
  otpCode: string,
  forceNewSession = false,
) {
  const data = await apiRequest<ParticipantSessionApi>(
    `/contests/${contestId}/participant-login/otp/verify`,
    undefined,
    {
      method: 'POST',
      body: JSON.stringify({
        email,
        force_new_session: forceNewSession,
        otp_code: otpCode,
      }),
    },
  );
  const session = toParticipantSession(contestId, data);
  saveParticipantSession(session);
  return session;
}

export async function createParticipantSessionFromGeneralToken(contestId: string, generalToken: string) {
  const data = await apiRequest<ParticipantSessionApi>(
    `/auth/general/contests/${contestId}/participant-session`,
    generalToken,
    { method: 'POST' },
  );
  const session = toParticipantSession(contestId, data);
  saveParticipantSession(session);
  return session;
}

export function getParticipantSessionMe(contestId: string, participantToken: string) {
  return apiRequest<Omit<ParticipantSessionApi, 'access_token' | 'workspace_path'>>(
    `/contests/${contestId}/participant-session/me`,
    participantToken,
  );
}

export function listParticipantTeams(contestId: string, token: string) {
  return apiRequest<ParticipantTeam[]>(`/operator/contests/${contestId}/participants`, token);
}

export function createParticipantTeam(
  contestId: string,
  token: string,
  body: {
    team_name: string;
    division_id: string;
    leader: TeamMemberDraft;
    members?: TeamMemberDraft[];
  },
) {
  return apiRequest<ParticipantTeam>(`/operator/contests/${contestId}/participants`, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function bulkCreateParticipantTeams(contestId: string, token: string, teams: TeamImportRow[]) {
  return apiRequest<ParticipantBulkImportResponse>(
    `/operator/contests/${contestId}/participants:bulk-create`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ teams }),
    },
  );
}

export function updateParticipantTeam(
  contestId: string,
  participantTeamId: string,
  token: string,
  body: Partial<Pick<ParticipantTeam, 'team_name' | 'division_id' | 'status'>>,
) {
  return apiRequest<ParticipantTeam>(
    `/operator/contests/${contestId}/participants/${participantTeamId}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  );
}

export function deleteParticipantTeam(
  contestId: string,
  participantTeamId: string,
  token: string,
) {
  return apiRequest<ParticipantTeam>(
    `/operator/contests/${contestId}/participants/${participantTeamId}`,
    token,
    { method: 'DELETE' },
  );
}

export function addParticipantTeamMember(
  contestId: string,
  participantTeamId: string,
  token: string,
  body: TeamMemberDraft,
) {
  return apiRequest<TeamMember>(
    `/operator/contests/${contestId}/participants/${participantTeamId}/members`,
    token,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export function updateParticipantTeamMember(
  contestId: string,
  participantTeamId: string,
  teamMemberId: string,
  token: string,
  body: Partial<Pick<TeamMember, 'name' | 'email' | 'role'>>,
) {
  return apiRequest<TeamMember>(
    `/operator/contests/${contestId}/participants/${participantTeamId}/members/${teamMemberId}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  );
}

export function revokeParticipantMemberSessions(
  contestId: string,
  participantTeamId: string,
  teamMemberId: string,
  token: string,
) {
  return apiRequest<TeamMember>(
    `/operator/contests/${contestId}/participants/${participantTeamId}/members/${teamMemberId}/sessions:revoke`,
    token,
    { method: 'POST' },
  );
}
