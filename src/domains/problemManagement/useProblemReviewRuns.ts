import { useEffect, useRef, useState } from 'react';
import {
  createOperatorTestSubmission,
  waitOperatorTestSubmissionStatus,
} from '@/domains/submissionScoreboard/api';
import { isSubmissionPending } from '@/domains/submissionScoreboard/status';
import type {
  JudgeLanguage,
  Submission,
} from '@/domains/submissionScoreboard/types';
import { formatUserApiError } from '@/shared/api/errors';

export type ProblemReviewRun = {
  id: string;
  problemId: string;
  language: JudgeLanguage;
  sourceCode: string;
  startedAt: string;
  phase: 'submitting' | 'judging' | 'done' | 'error';
  submission?: Submission;
  error?: string;
};

export function isReviewRunPending(run: ProblemReviewRun) {
  return run.phase === 'submitting' || run.phase === 'judging';
}

/** Lives above the selected problem so switching problems does not interrupt judging. */
export default function useProblemReviewRuns(contestId: string, token: string) {
  const [runs, setRuns] = useState<ProblemReviewRun[]>([]);
  const mounted = useRef(false);
  const activeProblems = useRef(new Set<string>());

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function update(id: string, patch: Partial<ProblemReviewRun>) {
    if (mounted.current)
      setRuns((previous) =>
        previous.map((run) => (run.id === id ? { ...run, ...patch } : run)),
      );
  }

  async function process(run: ProblemReviewRun) {
    activeProblems.current.add(run.problemId);
    try {
      let submission =
        run.submission ??
        (await createOperatorTestSubmission(contestId, run.problemId, token, {
          language: run.language,
          source_code: run.sourceCode,
        }));
      while (mounted.current) {
        const pending = isSubmissionPending(submission.status);
        update(run.id, {
          submission,
          phase: pending ? 'judging' : 'done',
          error: undefined,
        });
        if (!pending) break;
        submission = await waitOperatorTestSubmissionStatus(
          contestId,
          submission.submission_id,
          token,
          {
            waitSeconds: 1,
            pollIntervalSeconds: 0.25,
          },
        );
        if (isSubmissionPending(submission.status))
          await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
    } catch (error) {
      update(run.id, {
        phase: 'error',
        error: formatUserApiError(
          error,
          '검수 채점 요청을 처리하지 못했습니다.',
        ),
      });
    } finally {
      activeProblems.current.delete(run.problemId);
    }
  }

  function submit(
    problemId: string,
    language: JudgeLanguage,
    sourceCode: string,
  ) {
    if (!sourceCode.trim() || activeProblems.current.has(problemId)) return;
    const run: ProblemReviewRun = {
      id: crypto.randomUUID(),
      problemId,
      language,
      sourceCode,
      startedAt: new Date().toISOString(),
      phase: 'submitting',
    };
    setRuns((previous) => [run, ...previous]);
    void process(run);
  }

  function resume(run: ProblemReviewRun) {
    if (
      !run.submission ||
      !isSubmissionPending(run.submission.status) ||
      activeProblems.current.has(run.problemId)
    )
      return;
    update(run.id, { phase: 'judging', error: undefined });
    void process(run);
  }

  return { runs, submit, resume };
}
