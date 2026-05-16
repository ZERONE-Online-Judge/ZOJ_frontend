import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import ContestPageFrame from '@/components/contest/ContestPageFrame';
import ContestPageShell from '@/components/contest/ContestPageShell';
import ProblemNavigationPills from '@/components/contest/problem/ProblemNavigationPills';
import ProblemSidebar from '@/components/contest/problem/ProblemSidebar';
import ProblemStatementPanel from '@/components/contest/problem/ProblemStatementPanel';
import ProblemSubmitPanel from '@/components/contest/problem/ProblemSubmitPanel';
import { contestQueryKeys } from '@/domains/contestRuntime/queryKeys';
import { useContestParticipantSession } from '@/domains/contestRuntime/useContestParticipantSession';
import {
  getContestProblem,
  getContestProblems,
  getDivisionProblems,
} from '@/domains/problemManagement/api';
import {
  createSubmission,
  getSubmission,
} from '@/domains/submissionScoreboard/api';
import type { JudgeLanguage } from '@/domains/submissionScoreboard/types';
import PageNotice from '@/shared/ui/PageNotice';

type ProblemView = 'combined' | 'problem' | 'submit';
type SubmitFeedbackStatus = 'idle' | 'loading' | 'ready' | 'error';
type SubmitFeedback = {
  message: string;
  status: SubmitFeedbackStatus;
};
type SubmitVariables = {
  draftKey: string;
  language: JudgeLanguage;
  sourceCode: string;
};

const judgeLanguages: JudgeLanguage[] = ['cpp17', 'python313', 'java8', 'c99'];
const emptySubmitFeedback: SubmitFeedback = { message: '', status: 'idle' };

function isJudgeLanguage(value?: string | null): value is JudgeLanguage {
  return judgeLanguages.includes(value as JudgeLanguage);
}

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
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const selectedSubmissionId = searchParams.get('submissionId');
  const { activeParticipantSession, ensureParticipantSession, generalSession } =
    useContestParticipantSession(contestId);
  const [draftLanguages, setDraftLanguages] = useState<
    Record<string, JudgeLanguage>
  >({});
  const [draftSourceCodes, setDraftSourceCodes] = useState<
    Record<string, string>
  >({});
  const [submitFeedbackByKey, setSubmitFeedbackByKey] = useState<
    Record<string, SubmitFeedback>
  >({});

  const problemQuery = useQuery({
    enabled: Boolean(problemId),
    queryKey: contestQueryKeys.problemDetail(
      contestId,
      problemId,
      generalSession?.accessToken,
      activeParticipantSession?.contestId,
      activeParticipantSession?.accessToken,
    ),
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
    queryKey: contestQueryKeys.problems(
      contestId,
      generalSession?.accessToken,
      activeParticipantSession?.contestId,
      activeParticipantSession?.division.division_id,
      activeParticipantSession?.accessToken,
    ),
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

  const selectedSubmissionQuery = useQuery({
    enabled: view === 'submit' && Boolean(selectedSubmissionId),
    queryKey: contestQueryKeys.submissionDetail(
      contestId,
      selectedSubmissionId,
      generalSession?.accessToken,
      activeParticipantSession?.contestId,
      activeParticipantSession?.accessToken,
    ),
    queryFn: async () => {
      const session = await ensureParticipantSession();
      if (!session?.accessToken) {
        throw new Error('제출 코드를 보려면 대회 참가 로그인이 필요합니다.');
      }

      return getSubmission(
        contestId,
        selectedSubmissionId!,
        session.accessToken,
      );
    },
  });

  const selectedSubmission = selectedSubmissionQuery.data;
  const selectedSubmissionProblemMismatch = Boolean(
    selectedSubmission &&
    problem &&
    selectedSubmission.problem_id !== problem.problem_id,
  );
  const activeDraftKey = selectedSubmissionId
    ? `submission:${selectedSubmissionId}`
    : `problem:${problemId}`;
  const fallbackLanguage = isJudgeLanguage(selectedSubmission?.language)
    ? selectedSubmission.language
    : 'cpp17';
  const activeLanguage = draftLanguages[activeDraftKey] ?? fallbackLanguage;
  const activeSourceCode =
    draftSourceCodes[activeDraftKey] ?? selectedSubmission?.source_code ?? '';
  const submitFeedback =
    submitFeedbackByKey[activeDraftKey] ?? emptySubmitFeedback;
  const isViewingSubmissionCode = Boolean(selectedSubmissionId);
  const submitPanelMessage = selectedSubmissionQuery.isError
    ? '선택한 제출 코드를 불러오지 못했습니다.'
    : selectedSubmissionProblemMismatch
      ? '선택한 제출 코드의 문제와 현재 문제 페이지가 일치하지 않습니다.'
      : submitFeedback.message ||
        (isViewingSubmissionCode
          ? '선택한 제출 코드입니다. 수정 후 다시 제출할 수 있습니다.'
          : '');
  const submitPanelMessageStatus: SubmitFeedbackStatus =
    selectedSubmissionQuery.isError
      ? 'error'
      : selectedSubmissionProblemMismatch
        ? 'error'
        : submitFeedback.status !== 'idle'
          ? submitFeedback.status
          : isViewingSubmissionCode
            ? 'ready'
            : 'idle';
  const canSubmitActiveDraft =
    !selectedSubmissionQuery.isError && !selectedSubmissionProblemMismatch;

  function handleLanguageChange(nextLanguage: JudgeLanguage) {
    setDraftLanguages((previous) => ({
      ...previous,
      [activeDraftKey]: nextLanguage,
    }));
  }

  function handleSourceCodeChange(nextSourceCode: string) {
    setDraftSourceCodes((previous) => ({
      ...previous,
      [activeDraftKey]: nextSourceCode,
    }));
  }

  function setSubmitFeedback(draftKey: string, feedback: SubmitFeedback) {
    setSubmitFeedbackByKey((previous) => ({
      ...previous,
      [draftKey]: feedback,
    }));
  }

  const submitMutation = useMutation({
    mutationFn: async ({ language, sourceCode }: SubmitVariables) => {
      if (!problem) throw new Error('문제 정보를 불러오는 중입니다.');
      if (
        selectedSubmission &&
        selectedSubmission.problem_id !== problem.problem_id
      ) {
        throw new Error(
          '선택한 제출 코드의 문제와 현재 문제 페이지가 일치하지 않습니다.',
        );
      }

      const session = await ensureParticipantSession();
      const token = session?.accessToken;

      if (!token) {
        throw new Error('제출하려면 대회 참가 로그인이 필요합니다.');
      }

      return createSubmission(contestId, problem.problem_id, token, {
        language,
        source_code: sourceCode,
      });
    },
    onMutate: ({ draftKey }: SubmitVariables) => {
      setSubmitFeedback(draftKey, {
        message: '제출을 전송하고 있습니다.',
        status: 'loading',
      });
    },
    onSuccess: (_submission, { draftKey }: SubmitVariables) => {
      setSubmitFeedback(draftKey, {
        message: '제출이 접수되었습니다.',
        status: 'ready',
      });
      void queryClient.invalidateQueries({
        queryKey: ['contest-submissions', contestId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['contest-scoreboard', contestId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['contest-problems', contestId],
      });
    },
    onError: (error, { draftKey }: SubmitVariables) => {
      setSubmitFeedback(draftKey, {
        message:
          error instanceof Error
            ? error.message
            : '제출을 처리하지 못했습니다.',
        status: 'error',
      });
    },
  });

  function submitActiveDraft() {
    if (!canSubmitActiveDraft) {
      setSubmitFeedback(activeDraftKey, {
        message: submitPanelMessage || '현재 상태에서는 제출할 수 없습니다.',
        status: 'error',
      });
      return;
    }

    submitMutation.mutate({
      draftKey: activeDraftKey,
      language: activeLanguage,
      sourceCode: activeSourceCode,
    });
  }

  return (
    <ContestPageFrame>
      <div className="mb-6">
        <ProblemNavigationPills
          active={view}
          contestId={contestId}
          problemId={problemId}
        />
      </div>

      {problemQuery.isLoading ||
      problemsQuery.isLoading ||
      selectedSubmissionQuery.isLoading ? (
        <PageNotice message="문제를 불러오는 중입니다." status="loading" />
      ) : null}
      {problemQuery.isError ||
      problemsQuery.isError ||
      selectedSubmissionQuery.isError ? (
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
            language={activeLanguage}
            message={submitFeedback.message}
            messageStatus={submitFeedback.status}
            onLanguageChange={handleLanguageChange}
            onSourceCodeChange={handleSourceCodeChange}
            onSubmit={submitActiveDraft}
            sourceCode={activeSourceCode}
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
        <section className="min-h-[760px] min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <ProblemSubmitPanel
            canSubmit={canSubmitActiveDraft}
            editorHeight={560}
            isSubmitting={submitMutation.isPending}
            language={activeLanguage}
            layout="standalone"
            message={submitPanelMessage}
            messageStatus={submitPanelMessageStatus}
            onLanguageChange={handleLanguageChange}
            onSourceCodeChange={handleSourceCodeChange}
            onSubmit={submitActiveDraft}
            sourceCode={activeSourceCode}
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
