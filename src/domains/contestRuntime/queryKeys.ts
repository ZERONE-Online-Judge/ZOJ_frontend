export const contestQueryKeys = {
  publicContest: (contestId?: string) => ['public-contest', contestId] as const,
  problems: (
    contestId: string,
    generalToken?: string,
    participantContestId?: string,
    divisionId?: string,
    participantToken?: string,
  ) =>
    [
      'contest-problems',
      contestId,
      generalToken ?? null,
      participantContestId ?? null,
      divisionId ?? null,
      participantToken ?? null,
    ] as const,
  submissions: (
    contestId: string,
    generalToken?: string,
    participantContestId?: string,
    divisionId?: string,
    participantToken?: string,
    cursor?: string,
    problemId?: string,
    includeSource?: boolean,
  ) =>
    [
      'contest-submissions',
      contestId,
      generalToken ?? null,
      participantContestId ?? null,
      divisionId ?? null,
      participantToken ?? null,
      cursor ?? null,
      problemId ?? null,
      includeSource ?? false,
    ] as const,
  scoreboard: (
    contestId: string,
    generalToken?: string,
    participantContestId?: string,
    divisionId?: string,
    participantToken?: string,
  ) =>
    [
      'contest-scoreboard',
      contestId,
      generalToken ?? null,
      participantContestId ?? null,
      divisionId ?? null,
      participantToken ?? null,
    ] as const,
  notices: (
    contestId: string,
    token?: string,
    participantContestId?: string,
    participantToken?: string,
  ) =>
    [
      'contest-notices',
      contestId,
      token ?? null,
      participantContestId ?? null,
      participantToken ?? null,
    ] as const,
  questions: (
    contestId: string,
    token?: string,
    participantContestId?: string,
    participantToken?: string,
  ) =>
    [
      'contest-questions',
      contestId,
      token ?? null,
      participantContestId ?? null,
      participantToken ?? null,
    ] as const,
  problemDetail: (
    contestId: string,
    problemId: string,
    generalToken?: string,
    participantContestId?: string,
    participantToken?: string,
  ) =>
    [
      'contest-problem',
      contestId,
      problemId,
      generalToken ?? null,
      participantContestId ?? null,
      participantToken ?? null,
    ] as const,
  submissionDetail: (
    contestId: string,
    submissionId: string | null,
    generalToken?: string,
    participantContestId?: string,
    participantToken?: string,
  ) =>
    [
      'contest-submission',
      contestId,
      submissionId,
      generalToken ?? null,
      participantContestId ?? null,
      participantToken ?? null,
    ] as const,
};
