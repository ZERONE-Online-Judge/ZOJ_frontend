import type { GeneralSession } from '@/domains/identityAccess/types';
import type {
  GeneralParticipantContest,
  ParticipantSession,
} from '@/domains/teamParticipation/types';

export function generalSessionQueryIdentity(
  session?: GeneralSession | null,
) {
  return session ? `account:${session.account.email}` : undefined;
}

export function participantSessionQueryIdentity(
  session?: ParticipantSession | null,
  participantContest?: GeneralParticipantContest | null,
) {
  if (session) {
    return [
      'participant',
      session.contestId,
      session.team.team_name,
      session.member.email,
      session.division.division_id,
    ].join(':');
  }

  if (participantContest) {
    return [
      'participant',
      participantContest.contest.contest_id,
      participantContest.team.participant_team_id,
      participantContest.member.email,
      participantContest.division.division_id,
    ].join(':');
  }

  return undefined;
}

export const contestQueryKeys = {
  publicContest: (contestId?: string) => ['public-contest', contestId] as const,
  problems: (
    contestId: string,
    generalIdentity?: string,
    participantContestId?: string,
    divisionId?: string,
    participantIdentity?: string,
  ) =>
    [
      'contest-problems',
      contestId,
      generalIdentity ?? null,
      participantContestId ?? null,
      divisionId ?? null,
      participantIdentity ?? null,
    ] as const,
  submissions: (
    contestId: string,
    generalIdentity?: string,
    participantContestId?: string,
    divisionId?: string,
    participantIdentity?: string,
    cursor?: string,
    problemId?: string,
    includeSource?: boolean,
  ) =>
    [
      'contest-submissions',
      contestId,
      generalIdentity ?? null,
      participantContestId ?? null,
      divisionId ?? null,
      participantIdentity ?? null,
      cursor ?? null,
      problemId ?? null,
      includeSource ?? false,
    ] as const,
  scoreboard: (
    contestId: string,
    generalIdentity?: string,
    participantContestId?: string,
    divisionId?: string,
    participantIdentity?: string,
  ) =>
    [
      'contest-scoreboard',
      contestId,
      generalIdentity ?? null,
      participantContestId ?? null,
      divisionId ?? null,
      participantIdentity ?? null,
    ] as const,
  notices: (
    contestId: string,
    identity?: string,
    participantContestId?: string,
    participantIdentity?: string,
  ) =>
    [
      'contest-notices',
      contestId,
      identity ?? null,
      participantContestId ?? null,
      participantIdentity ?? null,
    ] as const,
  questions: (
    contestId: string,
    identity?: string,
    participantContestId?: string,
    participantIdentity?: string,
  ) =>
    [
      'contest-questions',
      contestId,
      identity ?? null,
      participantContestId ?? null,
      participantIdentity ?? null,
    ] as const,
  problemDetail: (
    contestId: string,
    problemId: string,
    generalIdentity?: string,
    participantContestId?: string,
    participantIdentity?: string,
  ) =>
    [
      'contest-problem',
      contestId,
      problemId,
      generalIdentity ?? null,
      participantContestId ?? null,
      participantIdentity ?? null,
    ] as const,
  problemAssets: (
    contestId: string,
    problemId: string,
    generalIdentity?: string,
    participantContestId?: string,
    participantIdentity?: string,
  ) =>
    [
      'contest-problem-assets',
      contestId,
      problemId,
      generalIdentity ?? null,
      participantContestId ?? null,
      participantIdentity ?? null,
    ] as const,
  submissionDetail: (
    contestId: string,
    submissionId: string | null,
    generalIdentity?: string,
    participantContestId?: string,
    participantIdentity?: string,
  ) =>
    [
      'contest-submission',
      contestId,
      submissionId,
      generalIdentity ?? null,
      participantContestId ?? null,
      participantIdentity ?? null,
    ] as const,
};
