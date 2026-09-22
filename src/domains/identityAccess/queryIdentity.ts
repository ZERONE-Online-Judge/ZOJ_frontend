import {
  loadStoredGeneralSession,
  loadStoredParticipantSession,
} from '@/domains/identityAccess/sessionStorage';
import {
  contestScopesFor,
  isServiceMaster,
} from '@/domains/identityAccess/permissions';
import type {
  GeneralSession,
  StaffSession,
} from '@/domains/identityAccess/types';

function permissionIdentity(session: GeneralSession | StaffSession) {
  const contestIds =
    'staff' in session
      ? Object.keys(session.staff.contest_scopes ?? {})
      : [
          ...session.operatorContests.map((entry) => entry.contest.contest_id),
          ...Object.keys(session.operatorSession?.staff.contest_scopes ?? {}),
        ];
  return JSON.stringify([
    isServiceMaster(session),
    [...new Set(contestIds)]
      .sort()
      .map((contestId) => [
        contestId,
        contestScopesFor(session, contestId).sort(),
      ]),
  ]);
}

export function tokenQueryIdentity(token?: string | null) {
  if (!token) return 'anonymous';

  const generalSession = loadStoredGeneralSession();
  if (generalSession?.accessToken === token) {
    return `general:${generalSession.account.email}:${permissionIdentity(generalSession)}`;
  }

  if (generalSession?.operatorSession?.accessToken === token) {
    const staff = generalSession.operatorSession.staff;
    return `operator:${staff.email}:${permissionIdentity(generalSession.operatorSession)}`;
  }

  const participantSession = loadStoredParticipantSession();
  if (participantSession?.accessToken === token) {
    return [
      'participant',
      participantSession.contestId,
      participantSession.member.email,
      participantSession.division.division_id,
    ].join(':');
  }

  return `token:${token.slice(0, 8)}:${token.slice(-8)}`;
}
