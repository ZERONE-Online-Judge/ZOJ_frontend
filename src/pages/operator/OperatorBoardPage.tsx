import './OperatorBoardPage.css';
import {
  hasOperatorAnswer,
  matchesQuestionSearch,
} from '@/domains/serviceCommunication/boardPresentation';
import useConfirmation from '@/shared/ui/useConfirmation';
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
import { contestStaffDisplayName } from '@/domains/identityAccess/staffDisplay';
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

function authorContext(teamName?: string | null, divisionName?: string | null) {
  const parts = [teamName, divisionName].filter((item): item is string =>
    Boolean(item),
  );
  return parts.length > 0 ? parts.join(' · ') : null;
}

function questionAuthorName(question: ContestQuestion) {
  return question.author_name ?? '참가자';
}

function questionAuthorContext(question: ContestQuestion) {
  return authorContext(question.team_name, question.division_name);
}

function answerAuthorLabel(question: ContestQuestion, answer: ContestAnswer) {
  if (answer.created_by_role === 'operator')
    return contestStaffDisplayName(
      answer.created_by_name,
      answer.created_by_title,
    );

  const name = answer.created_by_name || answer.created_by_email || '참가자';
  const answerEmail = normalizedEmail(answer.created_by_email);
  const isQuestionAuthor =
    answerEmail !== '' &&
    answerEmail === normalizedEmail(question.author_email);

  return isQuestionAuthor ? `${name} (글쓴이)` : name;
}

function answerAuthorContext(answer: ContestAnswer) {
  if (answer.created_by_role === 'operator') return null;
  return authorContext(
    answer.created_by_team_name,
    answer.created_by_division_name,
  );
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
          <PageLayout
            variant="management"
            title={sharedUiText.contestSelectionRequiredTitle}
          >
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
  const { confirm: confirmAction, dialog: confirmationDialog } =
    useConfirmation();

  const queryClient = useQueryClient();
  const queryIdentity = tokenQueryIdentity(token);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
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
          Number(!hasOperatorAnswer(b)) - Number(!hasOperatorAnswer(a)) ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [questionsQuery.data],
  );
  const pendingCount = questions.filter(
    (question) => !hasOperatorAnswer(question),
  ).length;
  const filteredQuestions = questions.filter(
    (question) =>
      matchesQuestionSearch(question, search) &&
      (statusFilter === 'all' ||
        (statusFilter === 'answered') === hasOperatorAnswer(question)) &&
      (visibilityFilter === 'all' || question.visibility === visibilityFilter),
  );
  const draftingQuestion = questions.find(
    (question) => question.contest_question_id === answerForm.questionId,
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
      if (answerForm.questionId === questionId) setAnswerForm(emptyAnswerForm);
      if (expandedQuestionId === questionId) {
        setExpandedQuestionId('');
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

  async function startAnswer(question: ContestQuestion) {
    if (answerMutation.isPending) return;
    if (answerForm.questionId === question.contest_question_id) return;
    if (
      answerForm.body.trim() &&
      !(await confirmAction('작성 중인 답변을 버리고 다른 질문에 답변할까요?'))
    )
      return;
    answerMutation.reset();
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
    if (answerMutation.isPending) return;
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

  async function removeQuestion(question: ContestQuestion) {
    const confirmed = await confirmAction(
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

  async function removeAnswer(
    question: ContestQuestion,
    answer: ContestAnswer,
  ) {
    const confirmed = await confirmAction('이 댓글/답변을 삭제할까요?');
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
    setFormError('');
  }

  return (
    <PageLayout
      variant="management"
      description="참가자가 남긴 질문을 확인하고 운영자 답변을 등록합니다."
      eyebrow="Operator"
      title={`${dashboardQuery.data?.contest.title ?? '대회'} 게시판`}
      width="full"
    >
      {confirmationDialog}

      <OperatorTabs contestId={contestId} />

      {dashboardQuery.error || questionsQuery.error ? (
        <ErrorBox
          error={dashboardQuery.error || questionsQuery.error}
          fallback="게시판 질문을 불러오지 못했습니다"
        />
      ) : null}

      <OperatorPanel
        description="운영자 답변이 없는 질문부터 표시합니다. 15초마다 새 질문을 확인합니다."
        title="질문 목록"
      >
        <div className="operator-board-toolbar">
          <div
            className="operator-board-filters"
            role="group"
            aria-label="답변 상태 필터"
          >
            {[
              ['all', '전체', questions.length],
              ['pending', '답변 필요', pendingCount],
              ['answered', '답변 완료', questions.length - pendingCount],
            ].map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                aria-pressed={statusFilter === value}
                onClick={() => setStatusFilter(String(value))}
              >
                {label} <span>{count}</span>
              </button>
            ))}
          </div>
          <div className="operator-board-search">
            <input
              aria-label="게시판 검색"
              type="search"
              placeholder="제목·내용·작성자·팀 검색"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              aria-label="질문 공개 범위 필터"
              value={visibilityFilter}
              onChange={(event) => setVisibilityFilter(event.target.value)}
            >
              <option value="all">전체 공개 범위</option>
              <option value="public">공개</option>
              <option value="private">비공개</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <p role="status">
            {filteredQuestions.length}개 질문
            {search || statusFilter !== 'all' || visibilityFilter !== 'all'
              ? ` / 전체 ${questions.length}개`
              : ''}
          </p>
          {search || statusFilter !== 'all' || visibilityFilter !== 'all' ? (
            <button
              type="button"
              className="rounded px-2 py-1 font-semibold text-indigo-700"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setVisibilityFilter('all');
              }}
            >
              필터 초기화
            </button>
          ) : null}
        </div>
        {answerForm.body.trim() &&
        draftingQuestion &&
        (expandedQuestionId !== answerForm.questionId ||
          !filteredQuestions.includes(draftingQuestion)) ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            <span className="min-w-0 break-words">
              작성 중인 답변이 있습니다: {draftingQuestion.title}
            </span>
            <button
              type="button"
              className="shrink-0 font-semibold underline underline-offset-4"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setVisibilityFilter('all');
                setExpandedQuestionId(answerForm.questionId);
              }}
            >
              이어서 작성
            </button>
          </div>
        ) : null}
        {questionsQuery.isLoading ? (
          <p role="status" className="py-8 text-center text-sm text-slate-600">
            질문을 불러오는 중입니다.
          </p>
        ) : null}
        <ul className="operator-board-list">
          {filteredQuestions.map((question) => {
            const isExpanded =
              expandedQuestionId === question.contest_question_id;

            return (
              <li key={question.contest_question_id}>
                <button
                  aria-expanded={isExpanded}
                  aria-controls={`question-detail-${question.contest_question_id}`}
                  className="operator-board-row"
                  onClick={() => toggleQuestion(question.contest_question_id)}
                  type="button"
                >
                  <span className="operator-board-row-main">
                    <span className="flex flex-wrap items-center gap-2">
                      <StatusBadge answered={hasOperatorAnswer(question)} />
                      <VisibilityBadge visibility={question.visibility} />
                      <span className="text-xs text-slate-600">
                        {answerCountLabel(question.answers.length)}
                      </span>
                    </span>
                    <strong className="operator-board-title">
                      {question.title}
                    </strong>
                    <span className="operator-board-preview">
                      {question.body}
                    </span>
                    <span className="operator-board-meta">
                      <span>
                        {questionAuthorName(question)}
                        {questionAuthorContext(question)
                          ? ` · ${questionAuthorContext(question)}`
                          : ''}
                      </span>
                      <time>{formatDateTime(question.created_at)}</time>
                    </span>
                  </span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className={`size-4 shrink-0 text-slate-600 transition-transform motion-reduce:transition-none ${isExpanded ? 'rotate-180' : ''}`}
                  >
                    <path d="m5 7.5 5 5 5-5" />
                  </svg>
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
        {!questionsQuery.isLoading && filteredQuestions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-medium text-slate-600">
            {questions.length
              ? '검색 조건에 맞는 질문이 없습니다. 필터를 바꿔보세요.'
              : '아직 등록된 질문이 없습니다.'}
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
        'rounded-full px-2 py-1 text-xs font-semibold',
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
    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
      {visibility === 'private' ? '비공개' : '공개'}
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
    <article
      id={`question-detail-${question.contest_question_id}`}
      className="operator-board-detail"
    >
      <div className="operator-board-question">
        <QuestionMeta question={question} />
        <p className="operator-board-body">{question.body}</p>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white disabled:bg-slate-300"
            disabled={isAnswerSubmitting}
            onClick={onStartAnswer}
            type="button"
          >
            <NoticeIcon />
            {isAnswerFormOpen ? '답변 작성 중' : '답변 작성'}
          </button>
          <button
            className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:text-slate-300"
            disabled={updatePending}
            onClick={onToggleVisibility}
            type="button"
          >
            {question.visibility === 'public' ? '비공개 전환' : '공개 전환'}
          </button>
          <button
            className="h-9 rounded-lg border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:text-slate-300"
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

      {isAnswerFormOpen ? (
        <form className="operator-board-composer" onSubmit={onSubmitAnswer}>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            공개 범위
            <select
              aria-label="답변 공개 범위"
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-600"
              disabled={forcedPrivateAnswer || isAnswerSubmitting}
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
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
              비공개 질문에는 비공개 답변만 등록할 수 있습니다.
            </p>
          ) : null}
          <textarea
            aria-label="답변 내용"
            autoFocus
            disabled={isAnswerSubmitting}
            placeholder="참가자에게 전달할 답변을 입력하세요."
            className="min-h-32 resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
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
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600"
              disabled={isAnswerSubmitting}
              onClick={onCancelAnswer}
              type="button"
            >
              취소
            </button>
            <button
              className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white disabled:bg-slate-300"
              disabled={isAnswerSubmitting}
              type="submit"
            >
              {isAnswerSubmitting ? '등록 중' : '답변 등록'}
            </button>
          </div>
        </form>
      ) : null}

      <section className="operator-board-replies" aria-label="답변 내역">
        <h3 className="text-sm font-semibold text-slate-700">
          답변 내역 · {question.answers.length}건
        </h3>
        {question.answers.map((answer) => (
          <article
            className="operator-board-reply"
            key={answer.contest_answer_id}
          >
            <div className="grid min-w-0 gap-3">
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                <span
                  className={[
                    'rounded-full px-3 py-1',
                    answer.created_by_role === 'operator'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-slate-100 text-slate-700',
                  ].join(' ')}
                >
                  {answerAuthorLabel(question, answer)}
                </span>
                {answerAuthorContext(answer) ? (
                  <span className="py-1 text-slate-600">
                    {answerAuthorContext(answer)}
                  </span>
                ) : null}
                <span className="py-1 text-slate-600">
                  {answer.visibility === 'public' ? '공개' : '비공개'}
                </span>
                <span className="py-1 text-slate-600">
                  {formatDateTime(answer.created_at)}
                </span>
              </div>
              <p className="operator-board-body">{answer.body}</p>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:text-slate-300"
                  disabled={answerActionPending}
                  onClick={() => onToggleAnswerVisibility(answer)}
                  type="button"
                >
                  {answer.visibility === 'public' ? '비공개 전환' : '공개 전환'}
                </button>
                <button
                  className="h-8 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:text-slate-300"
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
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
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
    </article>
  );
}

function QuestionMeta({ question }: { question: ContestQuestion }) {
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium text-slate-600">
      <span>작성자: {questionAuthorName(question)}</span>
      <span>팀: {question.team_name ?? '-'}</span>
      <span>유형: {question.division_name ?? '-'}</span>
      <span>작성일: {formatDateTime(question.created_at)}</span>
    </span>
  );
}

function ErrorBox({ error, fallback }: { error: unknown; fallback: string }) {
  return (
    <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
      {error ? formatApiError(error, fallback) : fallback}
    </p>
  );
}
