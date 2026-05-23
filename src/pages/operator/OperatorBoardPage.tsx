import { type FormEvent, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageLayout from '@/components/common/PageLayout';
import { sharedUiText } from '@/data/uiText';
import {
  NoticeIcon,
  OperatorAccessGate,
  OperatorPanel,
  OperatorTabs,
} from '@/components/operator/OperatorShell';
import { getOperatorContestDashboard } from '@/domains/contestAdministration/api';
import { tokenQueryIdentity } from '@/domains/identityAccess/queryIdentity';
import {
  createContestAnswer,
  deleteContestAnswer,
  deleteContestQuestion,
  listOperatorContestQuestions,
  updateContestAnswer,
  updateContestQuestion,
} from '@/domains/serviceCommunication/api';
import type {
  ContestAnswer,
  ContestQuestion,
} from '@/domains/serviceCommunication/types';
import { formatApiError } from '@/shared/api/errors';
import { formatDateTime } from '@/shared/lib/dateTime';

type AnswerForm = {
  body: string;
  questionId: string;
  visibility: 'public' | 'questioner';
};

const emptyAnswerForm: AnswerForm = {
  body: '',
  questionId: '',
  visibility: 'public',
};

function normalizedEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

function answerAuthorLabel(question: ContestQuestion, answer: ContestAnswer) {
  if (answer.created_by_role === 'operator') return '운영자 답변';

  const name = answer.created_by_name || answer.created_by_email || '참가자';
  const isQuestionAuthor =
    normalizedEmail(answer.created_by_email) &&
    normalizedEmail(answer.created_by_email) ===
      normalizedEmail(question.author_email);

  return isQuestionAuthor ? `${name} (글쓴이)` : name;
}

function answerCountLabel(count: number) {
  return count > 0 ? `답변 ${count}건` : '답변 없음';
}

export default function OperatorBoardPage() {
  const { contestId } = useParams();

  return (
    <OperatorAccessGate
      contestId={contestId}
      permission="contest.board.question.view"
    >
      {(session) =>
        contestId ? (
          <OperatorBoardContent
            contestId={contestId}
            token={session.accessToken}
          />
        ) : (
          <PageLayout title={sharedUiText.contestSelectionRequiredTitle}>
            {sharedUiText.contestSelectionRequiredBody}
          </PageLayout>
        )
      }
    </OperatorAccessGate>
  );
}

function OperatorBoardContent({
  contestId,
  token,
}: {
  contestId: string;
  token: string;
}) {
  const queryClient = useQueryClient();
  const queryIdentity = tokenQueryIdentity(token);
  const [expandedQuestionId, setExpandedQuestionId] = useState('');
  const [answerForm, setAnswerForm] = useState(emptyAnswerForm);
  const [formError, setFormError] = useState('');

  const dashboardQuery = useQuery({
    queryKey: ['operator', 'dashboard', contestId, queryIdentity],
    queryFn: () => getOperatorContestDashboard(contestId, token),
  });
  const questionsQuery = useQuery({
    queryKey: ['operator', 'boards', contestId, queryIdentity],
    queryFn: () => listOperatorContestQuestions(contestId, token),
    refetchInterval: 15_000,
  });

  const questions = useMemo(
    () =>
      [...(questionsQuery.data ?? [])].sort(
        (a, b) =>
          Number(b.answers.length === 0) - Number(a.answers.length === 0) ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [questionsQuery.data],
  );
  const answerMutation = useMutation({
    mutationFn: () => {
      const question = questions.find(
        (item) => item.contest_question_id === answerForm.questionId,
      );

      return createContestAnswer(contestId, answerForm.questionId, token, {
        body: answerForm.body.trim(),
        visibility:
          question?.visibility === 'private'
            ? 'questioner'
            : answerForm.visibility,
      });
    },
    onSuccess: () => {
      setAnswerForm(emptyAnswerForm);
      setFormError('');
      void queryClient.invalidateQueries({
        queryKey: ['operator', 'boards', contestId],
      });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: ({
      questionId,
      visibility,
    }: {
      questionId: string;
      visibility: ContestQuestion['visibility'];
    }) => updateContestQuestion(contestId, questionId, token, { visibility }),
    onSuccess: (question) => {
      setExpandedQuestionId(question.contest_question_id);
      if (
        answerForm.questionId === question.contest_question_id &&
        question.visibility === 'private'
      ) {
        setAnswerForm((previous) => ({
          ...previous,
          visibility: 'questioner',
        }));
      }
      void queryClient.invalidateQueries({
        queryKey: ['operator', 'boards', contestId],
      });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (questionId: string) =>
      deleteContestQuestion(contestId, questionId, token),
    onSuccess: (_result, questionId) => {
      if (expandedQuestionId === questionId) {
        setExpandedQuestionId('');
        setAnswerForm(emptyAnswerForm);
      }
      void queryClient.invalidateQueries({
        queryKey: ['operator', 'boards', contestId],
      });
    },
  });
  const updateAnswerMutation = useMutation({
    mutationFn: ({
      answerId,
      questionId,
      visibility,
    }: {
      answerId: string;
      questionId: string;
      visibility: ContestAnswer['visibility'];
    }) =>
      updateContestAnswer(contestId, questionId, answerId, token, {
        visibility,
      }),
    onSuccess: (_answer, variables) => {
      setExpandedQuestionId(variables.questionId);
      void queryClient.invalidateQueries({
        queryKey: ['operator', 'boards', contestId],
      });
    },
  });
  const deleteAnswerMutation = useMutation({
    mutationFn: ({
      answerId,
      questionId,
    }: {
      answerId: string;
      questionId: string;
    }) => deleteContestAnswer(contestId, questionId, answerId, token),
    onSuccess: (_result, variables) => {
      setExpandedQuestionId(variables.questionId);
      void queryClient.invalidateQueries({
        queryKey: ['operator', 'boards', contestId],
      });
    },
  });

  function startAnswer(question: ContestQuestion) {
    setExpandedQuestionId(question.contest_question_id);
    setAnswerForm({
      body: '',
      questionId: question.contest_question_id,
      visibility: question.visibility === 'private' ? 'questioner' : 'public',
    });
    setFormError('');
  }

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!answerForm.questionId) {
      setFormError('답변할 질문을 선택해 주세요.');
      return;
    }
    if (!answerForm.body.trim()) {
      setFormError('답변 내용을 입력해 주세요.');
      return;
    }
    answerMutation.mutate();
  }

  function toggleQuestionVisibility(question: ContestQuestion) {
    updateQuestionMutation.mutate({
      questionId: question.contest_question_id,
      visibility: question.visibility === 'public' ? 'private' : 'public',
    });
  }

  function removeQuestion(question: ContestQuestion) {
    const confirmed = window.confirm(
      `"${question.title}" 게시글을 삭제할까요? 답변도 함께 삭제되며 복구할 수 없습니다.`,
    );
    if (!confirmed) return;
    deleteQuestionMutation.mutate(question.contest_question_id);
  }

  function toggleAnswerVisibility(
    question: ContestQuestion,
    answer: ContestAnswer,
  ) {
    updateAnswerMutation.mutate({
      answerId: answer.contest_answer_id,
      questionId: question.contest_question_id,
      visibility: answer.visibility === 'public' ? 'questioner' : 'public',
    });
  }

  function removeAnswer(question: ContestQuestion, answer: ContestAnswer) {
    const confirmed = window.confirm('이 댓글/답변을 삭제할까요?');
    if (!confirmed) return;
    deleteAnswerMutation.mutate({
      answerId: answer.contest_answer_id,
      questionId: question.contest_question_id,
    });
  }

  function toggleQuestion(questionId: string) {
    setExpandedQuestionId((current) =>
      current === questionId ? '' : questionId,
    );
    setAnswerForm(emptyAnswerForm);
    setFormError('');
  }

  return (
    <PageLayout
      description="참가자가 남긴 질문을 확인하고 운영자 답변을 등록합니다."
      eyebrow="Operator"
      title={`${dashboardQuery.data?.contest.title ?? '대회'} 게시판`}
      width="7xl"
    >
      <OperatorTabs contestId={contestId} />

      {dashboardQuery.error || questionsQuery.error ? (
        <ErrorBox
          error={dashboardQuery.error || questionsQuery.error}
          fallback="게시판 질문을 불러오지 못했습니다"
        />
      ) : null}

      <OperatorPanel
        description="답변이 필요한 질문을 우선 표시합니다. 질문을 클릭하면 아래로 상세가 펼쳐집니다."
        title="질문 목록"
      >
        <ul className="zoj-list-stagger zoj-row-motion divide-y divide-slate-200 border-y border-slate-200">
          {questions.map((question) => {
            const isExpanded =
              expandedQuestionId === question.contest_question_id;

            return (
              <li key={question.contest_question_id}>
                <button
                  aria-expanded={isExpanded}
                  className={[
                    'grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-5 px-4 py-5 text-left transition hover:bg-slate-50',
                    isExpanded ? 'bg-slate-50' : '',
                  ].join(' ')}
                  onClick={() => toggleQuestion(question.contest_question_id)}
                  type="button"
                >
                  <span className="flex min-w-0 flex-wrap items-center gap-3">
                    <StatusBadge answered={question.answers.length > 0} />
                    <VisibilityBadge visibility={question.visibility} />
                    <strong className="min-w-0 text-base font-black break-keep text-slate-950 sm:truncate">
                      {question.title}
                    </strong>
                    <AnswerCountBadge count={question.answers.length} />
                  </span>
                  <span className="shrink-0 text-sm font-medium text-slate-500">
                    {question.team_name ?? question.author_name ?? '참가자'} ·{' '}
                    {formatDateTime(question.created_at)}
                  </span>
                </button>

                {isExpanded ? (
                  <QuestionInlineDetail
                    answerForm={answerForm}
                    answerMutationError={answerMutation.error}
                    deleteError={deleteQuestionMutation.error}
                    formError={formError}
                    isAnswerSubmitting={answerMutation.isPending}
                    onAnswerChange={setAnswerForm}
                    onCancelAnswer={() => {
                      setAnswerForm(emptyAnswerForm);
                      setFormError('');
                    }}
                    onDelete={() => removeQuestion(question)}
                    onStartAnswer={() => startAnswer(question)}
                    onSubmitAnswer={submitAnswer}
                    onDeleteAnswer={(answer) => removeAnswer(question, answer)}
                    onToggleAnswerVisibility={(answer) =>
                      toggleAnswerVisibility(question, answer)
                    }
                    onToggleVisibility={() =>
                      toggleQuestionVisibility(question)
                    }
                    question={question}
                    answerActionError={
                      updateAnswerMutation.error || deleteAnswerMutation.error
                    }
                    answerActionPending={
                      updateAnswerMutation.isPending ||
                      deleteAnswerMutation.isPending
                    }
                    updateError={updateQuestionMutation.error}
                    updatePending={updateQuestionMutation.isPending}
                    deletePending={deleteQuestionMutation.isPending}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
        {!questionsQuery.isLoading && questions.length === 0 ? (
          <p className="rounded border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-bold text-slate-500">
            표시할 질문이 없습니다.
          </p>
        ) : null}
      </OperatorPanel>
    </PageLayout>
  );
}

function StatusBadge({ answered }: { answered: boolean }) {
  return (
    <span
      className={[
        'rounded-full px-2 py-1 text-xs font-black',
        answered
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-amber-100 text-amber-700',
      ].join(' ')}
    >
      {answered ? '답변 완료' : '답변 필요'}
    </span>
  );
}

function VisibilityBadge({
  visibility,
}: {
  visibility: ContestQuestion['visibility'];
}) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">
      {visibility === 'private' ? '비공개' : '공개'}
    </span>
  );
}

function AnswerCountBadge({ count }: { count: number }) {
  return (
    <span
      className={[
        'rounded-full px-2 py-1 text-xs font-black',
        count > 0
          ? 'bg-violet-100 text-violet-700'
          : 'bg-amber-100 text-amber-700',
      ].join(' ')}
    >
      {answerCountLabel(count)}
    </span>
  );
}

function QuestionInlineDetail({
  answerActionError,
  answerActionPending,
  answerForm,
  answerMutationError,
  deleteError,
  deletePending,
  formError,
  isAnswerSubmitting,
  onAnswerChange,
  onCancelAnswer,
  onDeleteAnswer,
  onDelete,
  onStartAnswer,
  onSubmitAnswer,
  onToggleAnswerVisibility,
  onToggleVisibility,
  question,
  updateError,
  updatePending,
}: {
  answerActionError: unknown;
  answerActionPending: boolean;
  answerForm: AnswerForm;
  answerMutationError: unknown;
  deleteError: unknown;
  deletePending: boolean;
  formError: string;
  isAnswerSubmitting: boolean;
  onAnswerChange: (form: AnswerForm) => void;
  onCancelAnswer: () => void;
  onDeleteAnswer: (answer: ContestAnswer) => void;
  onDelete: () => void;
  onStartAnswer: () => void;
  onSubmitAnswer: (event: FormEvent<HTMLFormElement>) => void;
  onToggleAnswerVisibility: (answer: ContestAnswer) => void;
  onToggleVisibility: () => void;
  question: ContestQuestion;
  updateError: unknown;
  updatePending: boolean;
}) {
  const isAnswerFormOpen =
    answerForm.questionId === question.contest_question_id;
  const forcedPrivateAnswer = question.visibility === 'private';

  return (
    <article className="grid gap-5 bg-white px-4 pb-6">
      <div className="grid gap-4 rounded border border-slate-200 bg-white px-5 py-4">
        <QuestionMeta question={question} />
        <p className="text-sm leading-7 whitespace-pre-wrap text-slate-950">
          {question.body}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-9 items-center gap-2 rounded bg-indigo-950 px-4 text-sm font-black text-white disabled:bg-slate-300"
            onClick={onStartAnswer}
            type="button"
          >
            <NoticeIcon />
            답변 작성
          </button>
          <button
            className="h-9 rounded border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:text-slate-300"
            disabled={updatePending}
            onClick={onToggleVisibility}
            type="button"
          >
            {question.visibility === 'public' ? '비공개 전환' : '공개 전환'}
          </button>
          <button
            className="h-9 rounded border border-rose-200 bg-white px-4 text-sm font-black text-rose-600 transition hover:bg-rose-50 disabled:text-slate-300"
            disabled={deletePending}
            onClick={onDelete}
            type="button"
          >
            삭제
          </button>
        </div>
      </div>

      {updateError || deleteError ? (
        <ErrorBox
          error={updateError || deleteError}
          fallback="게시글 처리에 실패했습니다"
        />
      ) : null}

      <section className="grid gap-3 pl-4 sm:pl-8">
        <h3 className="text-sm font-black text-slate-700">답변</h3>
        {question.answers.map((answer) => (
          <article
            className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3"
            key={answer.contest_answer_id}
          >
            <span className="pt-2 text-2xl leading-none font-black text-slate-300">
              ㄴ
            </span>
            <div className="grid gap-3 rounded border border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex flex-wrap gap-2 text-xs font-black text-slate-500">
                <span
                  className={[
                    'rounded-full px-3 py-1',
                    answer.created_by_role === 'operator'
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-slate-100 text-slate-700',
                  ].join(' ')}
                >
                  {answerAuthorLabel(question, answer)}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-slate-600">
                  {answer.visibility === 'public' ? '공개' : '비공개'}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-slate-600">
                  {formatDateTime(answer.created_at)}
                </span>
              </div>
              <p className="text-sm leading-7 whitespace-pre-wrap text-slate-950">
                {answer.body}
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  className="h-8 rounded border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:text-slate-300"
                  disabled={answerActionPending}
                  onClick={() => onToggleAnswerVisibility(answer)}
                  type="button"
                >
                  {answer.visibility === 'public' ? '비공개 전환' : '공개 전환'}
                </button>
                <button
                  className="h-8 rounded border border-rose-200 bg-white px-3 text-xs font-black text-rose-600 transition hover:bg-rose-50 disabled:text-slate-300"
                  disabled={answerActionPending}
                  onClick={() => onDeleteAnswer(answer)}
                  type="button"
                >
                  삭제
                </button>
              </div>
            </div>
          </article>
        ))}
        {question.answers.length === 0 ? (
          <p className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
            아직 등록된 답변이 없습니다.
          </p>
        ) : null}
        {answerActionError ? (
          <ErrorBox
            error={answerActionError}
            fallback="댓글/답변 처리에 실패했습니다"
          />
        ) : null}
      </section>

      {isAnswerFormOpen ? (
        <form
          className="grid gap-3 rounded border border-slate-200 bg-slate-50 p-4"
          onSubmit={onSubmitAnswer}
        >
          <label className="grid gap-2 text-sm font-black text-slate-700">
            공개 범위
            <select
              className="h-10 rounded border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-500"
              disabled={forcedPrivateAnswer}
              onChange={(event) =>
                onAnswerChange({
                  ...answerForm,
                  visibility: event.target.value as AnswerForm['visibility'],
                })
              }
              value={forcedPrivateAnswer ? 'questioner' : answerForm.visibility}
            >
              {!forcedPrivateAnswer ? (
                <option value="public">공개</option>
              ) : null}
              <option value="questioner">비공개</option>
            </select>
          </label>
          {forcedPrivateAnswer ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
              비공개 질문에는 비공개 답변만 등록할 수 있습니다.
            </p>
          ) : null}
          <textarea
            className="min-h-32 resize-y rounded border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            onChange={(event) =>
              onAnswerChange({ ...answerForm, body: event.target.value })
            }
            value={answerForm.body}
          />
          {formError || answerMutationError ? (
            <ErrorBox
              error={answerMutationError}
              fallback={formError || '답변 등록에 실패했습니다'}
            />
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              className="h-10 rounded border border-slate-200 bg-white px-4 text-sm font-black text-slate-600"
              onClick={onCancelAnswer}
              type="button"
            >
              취소
            </button>
            <button
              className="h-10 rounded bg-indigo-950 px-4 text-sm font-black text-white disabled:bg-slate-300"
              disabled={isAnswerSubmitting}
              type="submit"
            >
              {isAnswerSubmitting ? '등록 중' : '답변 등록'}
            </button>
          </div>
        </form>
      ) : null}
    </article>
  );
}

function QuestionMeta({ question }: { question: ContestQuestion }) {
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1 text-sm font-bold text-slate-500">
      <span>팀: {question.team_name ?? '-'}</span>
      <span>작성자: {question.author_name ?? '-'}</span>
      <span>작성일: {formatDateTime(question.created_at)}</span>
    </span>
  );
}

function ErrorBox({ error, fallback }: { error: unknown; fallback: string }) {
  return (
    <p className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
      {error ? formatApiError(error, fallback) : fallback}
    </p>
  );
}
