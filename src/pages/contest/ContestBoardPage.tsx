import { type FormEvent, type ReactNode, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { PageHeading } from '@/components/common/PageLayout';
import ContestPageFrame from '@/components/contest/ContestPageFrame';
import ContestPageNavigation from '@/components/contest/ContestPageNavigation';
import ContestPageShell from '@/components/contest/ContestPageShell';
import { contestBoardText } from '@/data/contestBoardContent';
import {
  canViewContestResource,
  contestAccessPhase,
  contestResourceAccess,
  contestResourceAccessMessage,
} from '@/domains/contestAdministration/logic';
import type { Contest } from '@/domains/contestAdministration/types';
import { contestQueryKeys } from '@/domains/contestRuntime/queryKeys';
import { useContestParticipantSession } from '@/domains/contestRuntime/useContestParticipantSession';
import {
  createContestQuestionAnswer,
  createContestQuestion,
  getContestNotices,
  getContestQuestions,
} from '@/domains/serviceCommunication/api';
import type {
  ContestNotice,
  ContestQuestion,
} from '@/domains/serviceCommunication/types';
import { formatUserApiError } from '@/shared/api/errors';
import { formatDateTime } from '@/shared/lib/dateTime';
import PageNotice from '@/shared/ui/PageNotice';

type QuestionFormState = {
  body: string;
  title: string;
  visibility: ContestQuestion['visibility'];
};

const emptyQuestionForm: QuestionFormState = {
  body: '',
  title: '',
  visibility: 'public',
};

const NOTICE_PAGE_SIZE = 5;

function ContestBoardContent({
  contest,
  contestId,
}: {
  contest: Contest;
  contestId: string;
}) {
  const queryClient = useQueryClient();
  const {
    activeParticipantSession,
    ensureParticipantSession,
    participantContest,
    token,
  } = useContestParticipantSession(contestId);
  const hasSessionAccess = Boolean(
    participantContest || activeParticipantSession,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedNoticeId = searchParams.get('noticeId') ?? '';
  const requestedQuestionId = searchParams.get('questionId') ?? '';
  const noticeAccess = contestResourceAccess(contest, 'notice');
  const boardAccess = contestResourceAccess(contest, 'board');
  const phase = contestAccessPhase(contest);
  const isEnded = phase === 'ended';
  const canViewNotices =
    !isEnded || canViewContestResource(contest, hasSessionAccess, noticeAccess);
  const canViewQuestions =
    !isEnded || canViewContestResource(contest, hasSessionAccess, boardAccess);
  const [expandedNoticeId, setExpandedNoticeId] = useState(requestedNoticeId);
  const [noticePage, setNoticePage] = useState(1);
  const [expandedQuestionId, setExpandedQuestionId] =
    useState(requestedQuestionId);
  const [isWritingQuestion, setIsWritingQuestion] = useState(false);
  const [questionForm, setQuestionForm] =
    useState<QuestionFormState>(emptyQuestionForm);
  const [formError, setFormError] = useState('');
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [answerErrors, setAnswerErrors] = useState<Record<string, string>>({});

  const noticesQuery = useQuery({
    enabled: canViewNotices,
    queryKey: contestQueryKeys.notices(
      contestId,
      token,
      participantContest?.contest.contest_id,
      activeParticipantSession?.accessToken,
    ),
    queryFn: async () => {
      const session =
        participantContest ||
        activeParticipantSession ||
        noticeAccess === 'participants'
          ? await ensureParticipantSession()
          : null;
      return getContestNotices(contestId, session?.accessToken ?? token);
    },
    refetchInterval: 15_000,
  });
  const questionsQuery = useQuery({
    enabled: canViewQuestions,
    queryKey: contestQueryKeys.questions(
      contestId,
      token,
      participantContest?.contest.contest_id,
      activeParticipantSession?.accessToken,
    ),
    queryFn: async () => {
      const session =
        participantContest ||
        activeParticipantSession ||
        boardAccess === 'participants'
          ? await ensureParticipantSession()
          : null;
      return getContestQuestions(contestId, session?.accessToken ?? token);
    },
    refetchInterval: 15_000,
  });
  const notices = useMemo(
    () =>
      [...(noticesQuery.data ?? [])].sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) ||
          new Date(b.published_at).getTime() -
            new Date(a.published_at).getTime(),
      ),
    [noticesQuery.data],
  );
  const targetNoticeIndex = requestedNoticeId
    ? notices.findIndex(
        (notice) => notice.contest_notice_id === requestedNoticeId,
      )
    : -1;
  const activeNoticeId = requestedNoticeId || expandedNoticeId;
  const currentNoticePage =
    targetNoticeIndex >= 0
      ? Math.floor(targetNoticeIndex / NOTICE_PAGE_SIZE) + 1
      : noticePage;
  const totalNoticePages = Math.max(
    1,
    Math.ceil(notices.length / NOTICE_PAGE_SIZE),
  );
  const pagedNotices = notices.slice(
    (currentNoticePage - 1) * NOTICE_PAGE_SIZE,
    currentNoticePage * NOTICE_PAGE_SIZE,
  );
  const questions = useMemo(
    () =>
      [...(questionsQuery.data ?? [])].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [questionsQuery.data],
  );
  const activeQuestionId = requestedQuestionId || expandedQuestionId;

  const createQuestionMutation = useMutation({
    mutationFn: async () => {
      const participantSession = await ensureParticipantSession();
      const submitToken = participantSession?.accessToken ?? token;

      if (!submitToken) {
        throw new Error(contestBoardText.questionSubmitLoginRequired);
      }

      return createContestQuestion(contestId, submitToken, {
        body: questionForm.body.trim(),
        title: questionForm.title.trim(),
        visibility: questionForm.visibility,
      });
    },
    onSuccess: (question) => {
      setQuestionForm(emptyQuestionForm);
      setFormError('');
      setIsWritingQuestion(false);
      setExpandedQuestionId(question.contest_question_id);
      void queryClient.invalidateQueries({
        queryKey: ['contest-questions', contestId],
      });
    },
  });
  const createAnswerMutation = useMutation({
    mutationFn: async ({
      body,
      questionId,
    }: {
      body: string;
      questionId: string;
    }) => {
      const participantSession = await ensureParticipantSession();
      const submitToken = participantSession?.accessToken ?? token;

      if (!submitToken) {
        throw new Error(contestBoardText.answerSubmitLoginRequired);
      }

      return createContestQuestionAnswer(contestId, questionId, submitToken, {
        body: body.trim(),
      });
    },
    onSuccess: (_answer, variables) => {
      setAnswerDrafts((current) => ({
        ...current,
        [variables.questionId]: '',
      }));
      setAnswerErrors((current) => ({
        ...current,
        [variables.questionId]: '',
      }));
      setExpandedQuestionId(variables.questionId);
      setSearchParams({ questionId: variables.questionId });
      void queryClient.invalidateQueries({
        queryKey: ['contest-questions', contestId],
      });
    },
  });

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!questionForm.title.trim()) {
      setFormError(contestBoardText.questionTitleRequired);
      return;
    }

    if (!questionForm.body.trim()) {
      setFormError(contestBoardText.questionBodyRequired);
      return;
    }

    createQuestionMutation.mutate();
  }

  function submitAnswer(questionId: string) {
    const body = answerDrafts[questionId]?.trim() ?? '';

    if (!body) {
      setAnswerErrors((current) => ({
        ...current,
        [questionId]: contestBoardText.answerBodyRequired,
      }));
      return;
    }

    setAnswerErrors((current) => ({ ...current, [questionId]: '' }));
    createAnswerMutation.mutate({ body, questionId });
  }

  function toggleNotice(noticeId: string) {
    const nextNoticeId = expandedNoticeId === noticeId ? '' : noticeId;
    setExpandedNoticeId(nextNoticeId);
    setSearchParams(nextNoticeId ? { noticeId: nextNoticeId } : {});
  }

  function changeNoticePage(page: number) {
    setNoticePage(page);
    setExpandedNoticeId('');
    setSearchParams({});
  }

  return (
    <ContestPageFrame>
      <PageHeading
        className="gap-4"
        description={contestBoardText.pageDescription}
        title={contestBoardText.pageTitle}
        variant="contest"
      />

      <ContestPageNavigation contest={contest} contestId={contestId} />

      <div className="mt-10 grid gap-10">
        <section>
          {canViewNotices ? (
            <NoticePanel
              currentPage={currentNoticePage}
              expandedNoticeId={activeNoticeId}
              isError={noticesQuery.isError}
              isLoading={noticesQuery.isLoading}
              notices={pagedNotices}
              onChangePage={changeNoticePage}
              onToggle={toggleNotice}
              showPagination={notices.length > NOTICE_PAGE_SIZE}
              totalPages={totalNoticePages}
            />
          ) : (
            <PageNotice
              message={contestResourceAccessMessage(
                contest,
                'notice',
                hasSessionAccess,
              )}
              status="idle"
            />
          )}
        </section>

        <section>
          {canViewQuestions ? (
            <QuestionPanel
              form={questionForm}
              formError={formError}
              isError={questionsQuery.isError}
              isLoading={questionsQuery.isLoading}
              isSubmitting={createQuestionMutation.isPending}
              isSubmittingAnswer={createAnswerMutation.isPending}
              submittingAnswerQuestionId={
                createAnswerMutation.variables?.questionId ?? ''
              }
              isWriting={isWritingQuestion}
              mutationError={createQuestionMutation.error}
              answerMutationError={createAnswerMutation.error}
              answerMutationQuestionId={
                createAnswerMutation.variables?.questionId ?? ''
              }
              answerDrafts={answerDrafts}
              answerErrors={answerErrors}
              onCancelWrite={() => {
                setIsWritingQuestion(false);
                setFormError('');
              }}
              onChangeAnswer={(questionId, body) => {
                setAnswerDrafts((current) => ({
                  ...current,
                  [questionId]: body,
                }));
                setAnswerErrors((current) => ({
                  ...current,
                  [questionId]: '',
                }));
              }}
              onChangeForm={setQuestionForm}
              expandedQuestionId={activeQuestionId}
              onToggleQuestion={(questionId) => {
                setExpandedQuestionId((current) =>
                  current === questionId ? '' : questionId,
                );
                setSearchParams(
                  activeQuestionId === questionId ? {} : { questionId },
                );
              }}
              onStartWrite={() => {
                setIsWritingQuestion(true);
                setFormError('');
              }}
              onSubmit={submitQuestion}
              onSubmitAnswer={submitAnswer}
              questions={questions}
            />
          ) : (
            <PageNotice
              message={contestResourceAccessMessage(
                contest,
                'board',
                hasSessionAccess,
              )}
              status="idle"
            />
          )}
        </section>
      </div>
    </ContestPageFrame>
  );
}

function NoticePanel({
  currentPage,
  expandedNoticeId,
  isError,
  isLoading,
  notices,
  onChangePage,
  onToggle,
  showPagination,
  totalPages,
}: {
  currentPage: number;
  expandedNoticeId: string;
  isError: boolean;
  isLoading: boolean;
  notices: ContestNotice[];
  onChangePage: (page: number) => void;
  onToggle: (noticeId: string) => void;
  showPagination: boolean;
  totalPages: number;
}) {
  return (
    <section className="grid gap-6">
      <h2 className="text-2xl font-black text-slate-950">
        {contestBoardText.noticePanelTitle}
      </h2>

      {isLoading ? (
        <PageNotice message={contestBoardText.noticeLoading} status="loading" />
      ) : null}
      {isError ? (
        <PageNotice message={contestBoardText.noticeLoadError} status="error" />
      ) : null}

      <ul className="divide-y divide-slate-200 border-y border-slate-200">
        {notices.map((notice) => {
          const isExpanded = expandedNoticeId === notice.contest_notice_id;

          return (
            <li key={notice.contest_notice_id}>
              <button
                aria-expanded={isExpanded}
                className={[
                  'grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-5 px-4 py-5 text-left transition hover:bg-slate-50',
                  isExpanded ? 'bg-slate-50' : '',
                ].join(' ')}
                onClick={() => onToggle(notice.contest_notice_id)}
                type="button"
              >
                <NoticeBadge
                  emergency={notice.emergency}
                  pinned={notice.pinned}
                />
                <strong className="min-w-0 text-base font-black break-keep text-slate-950 sm:truncate">
                  {notice.title}
                </strong>
                <time className="shrink-0 text-sm font-medium text-slate-500">
                  {formatDateTime(notice.published_at)}
                </time>
              </button>
              {isExpanded ? (
                <article className="bg-white px-4 pb-6">
                  <p className="rounded border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-7 whitespace-pre-wrap text-slate-950">
                    {notice.body}
                  </p>
                </article>
              ) : null}
            </li>
          );
        })}
      </ul>

      {showPagination ? (
        <Pagination
          currentPage={currentPage}
          onChange={onChangePage}
          totalPages={totalPages}
        />
      ) : null}

      {!isLoading && notices.length === 0 ? (
        <PageNotice message={contestBoardText.emptyNotices} status="idle" />
      ) : null}
    </section>
  );
}

function Pagination({
  currentPage,
  onChange,
  totalPages,
}: {
  currentPage: number;
  onChange: (page: number) => void;
  totalPages: number;
}) {
  return (
    <nav className="flex flex-wrap items-center justify-center gap-2">
      {Array.from({ length: totalPages }, (_, index) => index + 1).map(
        (page) => (
          <button
            className={[
              'h-9 min-w-9 rounded border px-3 text-sm font-black transition',
              currentPage === page
                ? 'border-slate-950 bg-slate-950 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            ].join(' ')}
            key={page}
            onClick={() => onChange(page)}
            type="button"
          >
            {page}
          </button>
        ),
      )}
    </nav>
  );
}

function NoticeBadge({
  emergency,
  pinned,
}: {
  emergency: boolean;
  pinned: boolean;
}) {
  const baseLabel = pinned
    ? contestBoardText.pinnedBadge
    : contestBoardText.tabNotices;
  const label = emergency
    ? `${baseLabel} · ${contestBoardText.emergencyBadge}`
    : baseLabel;

  return (
    <span
      className={[
        'inline-flex h-7 min-w-12 items-center justify-center rounded-full px-3 text-xs font-black',
        pinned ? 'bg-red-600 text-white' : 'bg-slate-950 text-white',
      ].join(' ')}
    >
      {label}
    </span>
  );
}

function QuestionPanel({
  answerDrafts,
  answerErrors,
  answerMutationError,
  answerMutationQuestionId,
  expandedQuestionId,
  form,
  formError,
  isError,
  isLoading,
  isSubmitting,
  isSubmittingAnswer,
  isWriting,
  mutationError,
  onCancelWrite,
  onChangeAnswer,
  onChangeForm,
  onToggleQuestion,
  onStartWrite,
  onSubmit,
  onSubmitAnswer,
  questions,
  submittingAnswerQuestionId,
}: {
  answerDrafts: Record<string, string>;
  answerErrors: Record<string, string>;
  answerMutationError: unknown;
  answerMutationQuestionId: string;
  expandedQuestionId: string;
  form: QuestionFormState;
  formError: string;
  isError: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  isSubmittingAnswer: boolean;
  isWriting: boolean;
  mutationError: unknown;
  onCancelWrite: () => void;
  onChangeAnswer: (questionId: string, body: string) => void;
  onChangeForm: (form: QuestionFormState) => void;
  onToggleQuestion: (questionId: string) => void;
  onStartWrite: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitAnswer: (questionId: string) => void;
  questions: ContestQuestion[];
  submittingAnswerQuestionId: string;
}) {
  return (
    <section className="grid gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-black text-slate-950">
          {contestBoardText.questionListTitle}
        </h2>
        {!isWriting ? (
          <DarkButton onClick={onStartWrite}>
            {contestBoardText.askButton}
          </DarkButton>
        ) : null}
      </header>

      {isWriting ? (
        <QuestionForm
          form={form}
          formError={formError}
          isSubmitting={isSubmitting}
          mutationError={mutationError}
          onCancel={onCancelWrite}
          onChange={onChangeForm}
          onSubmit={onSubmit}
        />
      ) : null}

      {isLoading ? (
        <PageNotice
          message={contestBoardText.questionLoading}
          status="loading"
        />
      ) : null}
      {isError ? (
        <PageNotice
          message={contestBoardText.questionLoadError}
          status="error"
        />
      ) : null}

      <QuestionList
        answerDrafts={answerDrafts}
        answerErrors={answerErrors}
        answerMutationError={answerMutationError}
        answerMutationQuestionId={answerMutationQuestionId}
        expandedQuestionId={expandedQuestionId}
        isSubmittingAnswer={isSubmittingAnswer}
        onChangeAnswer={onChangeAnswer}
        onSubmitAnswer={onSubmitAnswer}
        onToggleQuestion={onToggleQuestion}
        questions={questions}
        submittingAnswerQuestionId={submittingAnswerQuestionId}
      />

      {!isLoading && questions.length === 0 ? (
        <PageNotice message={contestBoardText.emptyQuestions} status="idle" />
      ) : null}
    </section>
  );
}

function QuestionForm({
  form,
  formError,
  isSubmitting,
  mutationError,
  onCancel,
  onChange,
  onSubmit,
}: {
  form: QuestionFormState;
  formError: string;
  isSubmitting: boolean;
  mutationError: unknown;
  onCancel: () => void;
  onChange: (form: QuestionFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      className="grid gap-6 rounded-lg border border-slate-200 bg-white p-6"
      onSubmit={onSubmit}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          {contestBoardText.titleLabel}
          <input
            className="h-11 rounded-full border border-slate-200 px-5 text-sm font-bold text-slate-950 transition outline-none focus:border-slate-400"
            onChange={(event) =>
              onChange({ ...form, title: event.target.value })
            }
            placeholder={contestBoardText.titlePlaceholder}
            value={form.title}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          {contestBoardText.visibilityLabel}
          <select
            className="h-11 rounded-full border border-slate-200 px-5 text-sm font-bold text-slate-600 transition outline-none focus:border-slate-400"
            onChange={(event) =>
              onChange({
                ...form,
                visibility: event.target.value as ContestQuestion['visibility'],
              })
            }
            value={form.visibility}
          >
            <option value="public">
              {contestBoardText.visibilityPublicOption}
            </option>
            <option value="private">
              {contestBoardText.visibilityPrivateOption}
            </option>
          </select>
        </label>
      </div>
      <textarea
        className="min-h-56 resize-y rounded-md border border-slate-200 px-5 py-4 text-sm leading-7 text-slate-950 transition outline-none focus:border-slate-400"
        onChange={(event) => onChange({ ...form, body: event.target.value })}
        placeholder={contestBoardText.bodyPlaceholder}
        value={form.body}
      />
      {formError || mutationError ? (
        <PageNotice
          message={
            formError ||
            formatUserApiError(
              mutationError,
              contestBoardText.questionSubmitError,
            )
          }
          status="error"
        />
      ) : null}
      <div className="flex justify-end gap-2">
        <button
          className="h-9 rounded-md border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition hover:border-slate-300"
          onClick={onCancel}
          type="button"
        >
          {contestBoardText.cancelButton}
        </button>
        <DarkButton disabled={isSubmitting} type="submit">
          {contestBoardText.questionSubmitButton}
        </DarkButton>
      </div>
    </form>
  );
}

function QuestionList({
  answerDrafts,
  answerErrors,
  answerMutationError,
  answerMutationQuestionId,
  expandedQuestionId,
  isSubmittingAnswer,
  onChangeAnswer,
  onSubmitAnswer,
  onToggleQuestion,
  questions,
  submittingAnswerQuestionId,
}: {
  answerDrafts: Record<string, string>;
  answerErrors: Record<string, string>;
  answerMutationError: unknown;
  answerMutationQuestionId: string;
  expandedQuestionId: string;
  isSubmittingAnswer: boolean;
  onChangeAnswer: (questionId: string, body: string) => void;
  onSubmitAnswer: (questionId: string) => void;
  onToggleQuestion: (questionId: string) => void;
  questions: ContestQuestion[];
  submittingAnswerQuestionId: string;
}) {
  return (
    <ul className="zoj-list-stagger zoj-row-motion divide-y divide-slate-200 border-y border-slate-200">
      {questions.map((question) => {
        const isExpanded = expandedQuestionId === question.contest_question_id;

        return (
          <li key={question.contest_question_id}>
            <button
              aria-expanded={isExpanded}
              className={[
                'grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-5 px-4 py-5 text-left transition hover:bg-slate-50',
                isExpanded ? 'bg-slate-50' : '',
              ].join(' ')}
              onClick={() => onToggleQuestion(question.contest_question_id)}
              type="button"
            >
              <span className="flex min-w-0 flex-wrap items-center gap-3">
                <VisibilityBadge visibility={question.visibility} />
                <strong className="min-w-0 text-base font-black break-keep text-slate-950 sm:truncate">
                  {question.title}
                </strong>
                <AnswerCountBadge count={question.answers.length} />
              </span>
              <span className="shrink-0 text-sm font-medium text-slate-500">
                {question.author_name ?? contestBoardText.authorFallback} ·{' '}
                {formatDateTime(question.created_at)}
              </span>
            </button>
            {isExpanded ? (
              <QuestionInlineDetail
                answerDraft={answerDrafts[question.contest_question_id] ?? ''}
                answerError={answerErrors[question.contest_question_id] ?? ''}
                answerMutationError={
                  answerMutationQuestionId === question.contest_question_id
                    ? answerMutationError
                    : null
                }
                isSubmittingAnswer={
                  isSubmittingAnswer &&
                  submittingAnswerQuestionId === question.contest_question_id
                }
                onChangeAnswer={(body) =>
                  onChangeAnswer(question.contest_question_id, body)
                }
                onSubmitAnswer={() =>
                  onSubmitAnswer(question.contest_question_id)
                }
                question={question}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function QuestionInlineDetail({
  answerDraft,
  answerError,
  answerMutationError,
  isSubmittingAnswer,
  onChangeAnswer,
  onSubmitAnswer,
  question,
}: {
  answerDraft: string;
  answerError: string;
  answerMutationError: unknown;
  isSubmittingAnswer: boolean;
  onChangeAnswer: (body: string) => void;
  onSubmitAnswer: () => void;
  question: ContestQuestion;
}) {
  const answers = [...question.answers].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime() ||
      a.contest_answer_id.localeCompare(b.contest_answer_id),
  );

  return (
    <article className="grid gap-5 bg-white px-4 pb-6">
      <div className="rounded border border-slate-200 bg-white px-5 py-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <InfoPill>
            {question.author_name ?? contestBoardText.authorFallback}
          </InfoPill>
          <InfoPill>{formatDateTime(question.created_at)}</InfoPill>
        </div>
        <p className="text-sm leading-7 whitespace-pre-wrap text-slate-950">
          {question.body}
        </p>
      </div>

      {answers.length > 0 ? (
        <section className="grid gap-3 pl-4 sm:pl-8">
          {answers.map((answer) => (
            <article
              className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3"
              key={answer.contest_answer_id}
            >
              <span className="pt-2 text-2xl leading-none font-black text-slate-300">
                ㄴ
              </span>
              <div className="grid gap-3 rounded border border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
                    {contestBoardText.answerBadge}
                  </span>
                  <InfoPill>{formatDateTime(answer.created_at)}</InfoPill>
                </div>
                <p className="text-sm leading-7 whitespace-pre-wrap text-slate-950">
                  {answer.body}
                </p>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="pl-4 sm:pl-8">
          <p className="rounded border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-500">
            아직 답변이 없습니다.
          </p>
        </div>
      )}

      <form
        className="grid gap-3 pl-4 sm:pl-8"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmitAnswer();
        }}
      >
        <textarea
          className="min-h-24 resize-y rounded-md border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-950 transition outline-none focus:border-slate-400"
          onChange={(event) => onChangeAnswer(event.target.value)}
          placeholder={contestBoardText.answerPlaceholder}
          value={answerDraft}
        />
        {answerError || answerMutationError ? (
          <PageNotice
            message={
              answerError ||
              formatUserApiError(
                answerMutationError,
                contestBoardText.answerSubmitError,
              )
            }
            status="error"
          />
        ) : null}
        <div className="flex justify-end">
          <DarkButton disabled={isSubmittingAnswer} type="submit">
            {contestBoardText.answerSubmitButton}
          </DarkButton>
        </div>
      </form>
    </article>
  );
}

function AnswerCountBadge({ count }: { count: number }) {
  return (
    <span
      className={[
        'inline-flex h-7 items-center rounded-full px-3 text-xs font-black',
        count > 0
          ? 'bg-violet-100 text-violet-700'
          : 'bg-amber-50 text-amber-700',
      ].join(' ')}
    >
      {count > 0 ? `답변 ${count}건` : '답변 없음'}
    </span>
  );
}

function VisibilityBadge({
  visibility,
}: {
  visibility: ContestQuestion['visibility'];
}) {
  return (
    <span className="inline-flex h-7 min-w-12 items-center justify-center rounded-full bg-slate-100 px-3 text-xs font-black text-slate-700">
      {visibility === 'private'
        ? contestBoardText.privateLabel
        : contestBoardText.publicLabel}
    </span>
  );
}

function InfoPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-7 items-center rounded-full bg-slate-100 px-3 text-xs font-black text-slate-600">
      {children}
    </span>
  );
}

function DarkButton({
  children,
  disabled,
  onClick,
  type = 'button',
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      className="h-9 rounded-md bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:bg-slate-300"
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

export default function ContestBoardPage() {
  return (
    <ContestPageShell>
      {({ contest }) => (
        <ContestBoardContent contest={contest} contestId={contest.contest_id} />
      )}
    </ContestPageShell>
  );
}
