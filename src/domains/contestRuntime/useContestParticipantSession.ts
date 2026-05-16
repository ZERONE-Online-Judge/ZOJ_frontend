import { useCallback } from 'react';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';
import { createParticipantSessionFromGeneralToken } from '@/domains/teamParticipation/api';

const participantSessionRequests = new Map<
  string,
  ReturnType<typeof createParticipantSessionFromGeneralToken>
>();

export function useContestParticipantSession(contestId: string) {
  const generalSession = useSessionStore((state) => state.generalSession);
  const participantSession = useSessionStore(
    (state) => state.participantSession,
  );
  const setParticipantSession = useSessionStore(
    (state) => state.setParticipantSession,
  );
  const participantContest = generalSession?.participantContests.find(
    (item) => item.contest.contest_id === contestId,
  );
  const activeParticipantSession =
    participantSession?.contestId === contestId ? participantSession : null;
  const divisionId =
    activeParticipantSession?.division.division_id ??
    participantContest?.division.division_id;
  const token =
    activeParticipantSession?.accessToken ?? generalSession?.accessToken;

  const ensureParticipantSession = useCallback(async () => {
    if (activeParticipantSession) return activeParticipantSession;
    if (!generalSession?.accessToken || !participantContest) return null;

    const requestKey = `${contestId}:${generalSession.accessToken}`;
    let request = participantSessionRequests.get(requestKey);

    if (!request) {
      request = createParticipantSessionFromGeneralToken(
        contestId,
        generalSession.accessToken,
      ).finally(() => {
        participantSessionRequests.delete(requestKey);
      });
      participantSessionRequests.set(requestKey, request);
    }

    const session = await request;
    setParticipantSession(session);

    return session;
  }, [
    activeParticipantSession,
    contestId,
    generalSession,
    participantContest,
    setParticipantSession,
  ]);

  return {
    activeParticipantSession,
    divisionId,
    ensureParticipantSession,
    generalSession,
    participantContest,
    participantSession,
    token,
  };
}
