import {
  loadStoredGeneralSession,
  loadStoredParticipantSession,
} from '@/domains/identityAccess/sessionStorage';

export function tokenQueryIdentity(token?: string | null) {
  if (!token) return 'anonymous';

  const generalSession = loadStoredGeneralSession();
  if (generalSession?.accessToken === token) {
    return `general:${generalSession.account.email}`;
  }

  if (generalSession?.operatorSession?.accessToken === token) {
    const staff = generalSession.operatorSession.staff;
    const scopeKeys = Object.keys(staff.contest_scopes ?? {}).sort().join(',');
    return `operator:${staff.email}:${staff.is_service_master ? 'master' : scopeKeys}`;
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
