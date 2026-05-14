import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import ContestPageFrame from '@/components/contest/ContestPageFrame';
import ContestPageShell from '@/components/contest/ContestPageShell';
import ProblemNavigationPills from '@/components/contest/problem/ProblemNavigationPills';
import ProblemSidebar from '@/components/contest/problem/ProblemSidebar';
import ProblemStatementPanel from '@/components/contest/problem/ProblemStatementPanel';
import ProblemSubmitPanel from '@/components/contest/problem/ProblemSubmitPanel';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';
import {
  getContestProblem,
  getContestProblems,
  getDivisionProblems,
} from '@/domains/problemManagement/api';
import { createSubmission } from '@/domains/submissionScoreboard/api';
import type { JudgeLanguage } from '@/domains/submissionScoreboard/types';
import { createParticipantSessionFromGeneralToken } from '@/domains/teamParticipation/api';
import PageNotice from '@/shared/ui/PageNotice';

type ProblemView = 'combined' | 'problem' | 'submit';

function problemViewFromParam(value?: string): ProblemView {
  if (value === 'statement') return 'problem';
  if (value === 'submit') return 'submit';

  return 'combined';
}

function ContestProblemDetailContent({
  contestId,
  problemId,
  view,
}: {
  contestId: string;
  problemId: string;
  view: ProblemView;
}) {
  const generalSession = useSessionStore((state) => state.generalSession);
  const participantSession = useSessionStore(
    (state) => state.participantSession,
  );
  const setParticipantSession = useSessionStore(
    (state) => state.setParticipantSession,
  );
  const [language, setLanguage] = useState<JudgeLanguage>('cpp17');
  const [sourceCode, setSourceCode] = useState('');
  const [message, setMessage] = useState('');
  const [messageStatus, setMessageStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');

  function handleLanguageChange(nextLanguage: JudgeLanguage) {
    setLanguage(nextLanguage);
  }

  const participantContest = generalSession?.participantContests.find(
    (item) => item.contest.contest_id === contestId,
  );
  const activeParticipantSession =
    participantSession?.contestId === contestId ? participantSession : null;
  async function ensureParticipantSession() {
    if (activeParticipantSession) return activeParticipantSession;
    if (!generalSession?.accessToken || !participantContest) return null;

    const session = await createParticipantSessionFromGeneralToken(
      contestId,
      generalSession.accessToken,
    );
    setParticipantSession(session);

    return session;
  }

  const problemQuery = useQuery({
    enabled: Boolean(problemId),
    queryKey: [
      'contest-problem',
      contestId,
      problemId,
      generalSession?.accessToken,
      participantSession?.contestId,
      participantSession?.accessToken,
    ],
    queryFn: async () => {
      const session = await ensureParticipantSession();

      return getContestProblem(
        contestId,
        problemId,
        session?.accessToken ?? generalSession?.accessToken,
      );
    },
  });

  const problem = problemQuery.data;
  const activeProblemId = problem?.problem_id ?? problemId;

  const problemsQuery = useQuery({
    enabled: view !== 'submit',
    queryKey: [
      'contest-problems',
      contestId,
      generalSession?.accessToken,
      participantSession?.contestId,
      participantSession?.division.division_id,
      participantSession?.accessToken,
    ],
    queryFn: async () => {
      const session = await ensureParticipantSession();
      if (session) {
        return getDivisionProblems(
          contestId,
          session.division.division_id,
          session.accessToken,
        );
      }

      return getContestProblems(contestId, generalSession?.accessToken);
    },
    refetchInterval: 15_000,
  });
  const problems = problemsQuery.data ?? [];

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!problem) throw new Error('문제 정보를 불러오는 중입니다.');

      const session = await ensureParticipantSession();
      const token = session?.accessToken;

      if (!token) throw new Error('제출하려면 대회 참가 로그인이 필요합니다.');

      return createSubmission(contestId, problem.problem_id, token, {
        language,
        source_code: sourceCode,
      });
    },
    onMutate: () => {
      setMessage('제출을 전송하고 있습니다.');
      setMessageStatus('loading');
    },
    onSuccess: () => {
      setMessage('제출이 접수되었습니다.');
      setMessageStatus('ready');
    },
    onError: (error) => {
      setMessage(
        error instanceof Error ? error.message : '제출을 처리하지 못했습니다.',
      );
      setMessageStatus('error');
    },
  });

  return (
    <ContestPageFrame>
      <div className="mb-6">
        <ProblemNavigationPills
          active={view}
          contestId={contestId}
          problemId={problemId}
        />
      </div>

      {problemQuery.isLoading || problemsQuery.isLoading ? (
        <PageNotice message="문제를 불러오는 중입니다." status="loading" />
      ) : null}
      {problemQuery.isError || problemsQuery.isError ? (
        <PageNotice message="문제를 불러오지 못했습니다." status="error" />
      ) : null}

      {problem && view === 'combined' ? (
        <section className="grid min-h-[760px] overflow-hidden rounded-lg border border-slate-200 bg-white lg:grid-cols-[15rem_minmax(0,1fr)_20rem]">
          <ProblemSidebar
            activeProblemId={activeProblemId}
            contestId={contestId}
            problems={problems}
          />
          <ProblemStatementPanel problem={problem} />
          <ProblemSubmitPanel
            isSubmitting={submitMutation.isPending}
            language={language}
            message={message}
            messageStatus={messageStatus}
            onLanguageChange={handleLanguageChange}
            onSourceCodeChange={setSourceCode}
            onSubmit={() => submitMutation.mutate()}
            sourceCode={sourceCode}
          />
        </section>
      ) : null}

      {problem && view === 'problem' ? (
        <section className="grid min-h-[760px] overflow-hidden rounded-lg border border-slate-200 bg-white lg:grid-cols-[15rem_minmax(0,1fr)]">
          <ProblemSidebar
            activeProblemId={activeProblemId}
            contestId={contestId}
            problems={problems}
            targetView="problem"
          />
          <ProblemStatementPanel problem={problem} />
        </section>
      ) : null}

      {problem && view === 'submit' ? (
        <section className="min-h-[760px] max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white">
          <ProblemSubmitPanel
            isSubmitting={submitMutation.isPending}
            language={language}
            message={message}
            messageStatus={messageStatus}
            onLanguageChange={handleLanguageChange}
            onSourceCodeChange={setSourceCode}
            onSubmit={() => submitMutation.mutate()}
            sourceCode={sourceCode}
          />
        </section>
      ) : null}
    </ContestPageFrame>
  );
}

export default function ContestProblemDetailPage() {
  const { problemId = '', problemView } = useParams();
  const view = problemViewFromParam(problemView);

  return (
    <ContestPageShell>
      {({ contest }) => (
        <ContestProblemDetailContent
          contestId={contest.contest_id}
          problemId={problemId}
          view={view}
        />
      )}
    </ContestPageShell>
  );
}
