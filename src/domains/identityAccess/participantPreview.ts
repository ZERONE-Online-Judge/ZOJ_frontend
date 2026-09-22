import { contestScopesFor } from '@/domains/identityAccess/permissions';
import type { GeneralSession } from '@/domains/identityAccess/types';

export function hasParticipantPreviewAccess(
  session: GeneralSession | null | undefined,
  contestId: string,
) {
  // Preview is a separate assignment; master wildcards do not opt into it.
  return contestScopesFor(session, contestId).includes(
    'contest.participant.preview',
  );
}
