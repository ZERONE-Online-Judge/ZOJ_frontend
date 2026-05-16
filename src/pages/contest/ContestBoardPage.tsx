import { type FormEvent, type ReactNode, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeading } from '@/components/common/PageLayout';
import ContestPageFrame from '@/components/contest/ContestPageFrame';
import ContestPageShell from '@/components/contest/ContestPageShell';
import { contestBoardText } from '@/data/contestBoardContent';
import { contestQueryKeys } from '@/domains/contestRuntime/queryKeys';
import { useContestParticipantSession } from '@/domains/contestRuntime/useContestParticipantSession';
import {
  createContestQuestion,
  getContestNotices,
  getContestQuestions,
} from '@/domains/serviceCommunication/api';
import type {
  ContestNotice,
  ContestQuestion,
} from '@/domains/serviceCommunication/types';
import { formatApiError } from '@/shared/api/errors';
import { formatDateTime } from '@/shared/lib/dateTime';
import PageNotice from '@/shared/ui/PageNotice';

type BoardMode = 'notices' | 'questions';

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

function shortDate(value?: string) {
  if (!value) return contestBoardText.listDateFallback;

  return new Intl.DateTimeFormat('ko-KR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
    .format(new Date(value))
    .replace(/\.\s?/g, '.')
    .replace(/\.$/, '');
}

function ContestBoardContent({ contestId }: { contestId: string }) {
  const queryClient = useQueryClient();
  const { ensureParticipantSession, token } =
    useContestParticipantSession(contestId);
  const [mode, setMode] = useState<BoardMode>('notices');
  const [selectedNotice, setSelectedNotice] = useState<ContestNotice | null>(
    null,
  );
  const [selectedQuestion, setSelectedQuestion] =
    useState<ContestQuestion | null>(null);
  const [isWritingQuestion, setIsWritingQuestion] = useState(false);
  const [questionForm, setQuestionForm] =
    useState<QuestionFormState>(emptyQuestionForm);
  const [formError, setFormError] = useState('');

  const noticesQuery = useQuery({
    queryKey: contestQueryKeys.notices(contestId, token),
    queryFn: () => getContestNotices(contestId, token),
    refetchInterval: 15_000,
  });
  const questionsQuery = useQuery({
    queryKey: contestQueryKeys.questions(contestId, token),
    queryFn: () => getContestQuestions(contestId, token),
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
  const questions = useMemo(
    () =>
      [...(questionsQuery.data ?? [])].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [questionsQuery.data],
  );

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
      setSelectedQuestion(question);
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

  return (
    <ContestPageFrame>
      <PageHeading
        className="gap-4"
        description={contestBoardText.pageDescription}
        title={contestBoardText.pageTitle}
        variant="contest"
      />

      <BoardTabs mode={mode} onChange={setMode} />

      <section className="mt-10">
        {mode === 'notices' ? (
          <NoticePanel
            isError={noticesQuery.isError}
            isLoading={noticesQuery.isLoading}
            notices={notices}
            onSelect={setSelectedNotice}
          />
        ) : (
          <QuestionPanel
            form={questionForm}
            formError={formError}
            isError={questionsQuery.isError}
            isLoading={questionsQuery.isLoading}
            isSubmitting={createQuestionMutation.isPending}
            isWriting={isWritingQuestion}
            mutationError={createQuestionMutation.error}
            onCancelWrite={() => {
              setIsWritingQuestion(false);
              setFormError('');
            }}
            onChangeForm={setQuestionForm}
            onSelect={setSelectedQuestion}
            onStartWrite={() => {
              setMode('questions');
              setIsWritingQuestion(true);
              setFormError('');
            }}
            onSubmit={submitQuestion}
            questions={questions}
          />
        )}
      </section>

      {selectedNotice ? (
        <NoticeDetail
          notice={selectedNotice}
          onClose={() => setSelectedNotice(null)}
        />
      ) : null}
      {selectedQuestion ? (
        <QuestionDetail
          onClose={() => setSelectedQuestion(null)}
          question={selectedQuestion}
        />
      ) : null}
    </ContestPageFrame>
  );
}

function BoardTabs({
  mode,
  onChange,
}: {
  mode: BoardMode;
  onChange: (mode: BoardMode) => void;
}) {
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <button
        className={tabClassName(mode === 'notices')}
        onClick={() => onChange('notices')}
        type="button"
      >
        {contestBoardText.tabNotices}
      </button>
      <button
        className={tabClassName(mode === 'questions')}
        onClick={() => onChange('questions')}
        type="button"
      >
        {contestBoardText.tabQuestions}
      </button>
    </div>
  );
}

function tabClassName(active: boolean) {
  return [
    'h-8 rounded-full border px-4 text-sm font-black transition',
    active
      ? 'border-slate-950 bg-slate-950 text-white'
      : 'border-slate-200 bg-white text-slate-950 hover:border-slate-400',
  ].join(' ');
}

function NoticePanel({
  isError,
  isLoading,
  notices,
  onSelect,
}: {
  isError: boolean;
  isLoading: boolean;
  notices: ContestNotice[];
  onSelect: (notice: ContestNotice) => void;
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
        {notices.map((notice) => (
          <li key={notice.contest_notice_id}>
            <button
              className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-5 px-4 py-5 text-left transition hover:bg-slate-50"
              onClick={() => onSelect(notice)}
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
                {shortDate(notice.published_at)}
              </time>
            </button>
          </li>
        ))}
      </ul>

      {!isLoading && notices.length === 0 ? (
        <PageNotice message={contestBoardText.emptyNotices} status="idle" />
      ) : null}
    </section>
  );
}

function NoticeBadge({
  emergency,
  pinned,
}: {
  emergency: boolean;
  pinned: boolean;
}) {
  const label = emergency
    ? contestBoardText.emergencyBadge
    : pinned
      ? contestBoardText.pinnedBadge
      : contestBoardText.tabNotices;

  return (
    <span
      className={[
        'inline-flex h-7 min-w-12 items-center justify-center rounded-full px-3 text-xs font-black',
        emergency ? 'bg-slate-950 text-white' : 'bg-slate-950 text-white',
      ].join(' ')}
    >
      {label}
    </span>
  );
}

function NoticeDetail({
  notice,
  onClose,
}: {
  notice: ContestNotice;
  onClose: () => void;
}) {
  return (
    <BoardOverlay>
      <article className="grid w-full max-w-4xl gap-7 rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header className="grid gap-5">
          <h2 className="text-2xl font-black break-keep text-slate-950">
            {notice.title}
          </h2>
          <div className="flex flex-wrap gap-2">
            <InfoPill>{contestBoardText.noticePanelTitle}</InfoPill>
            <InfoPill>{formatDateTime(notice.published_at)}</InfoPill>
            <InfoPill>{contestBoardText.noticeDetailMeta}</InfoPill>
          </div>
        </header>

        <div className="text-sm leading-7 whitespace-pre-wrap text-slate-950">
          {notice.body}
        </div>

        <div className="flex justify-end">
          <DarkButton onClick={onClose}>
            {contestBoardText.closeButton}
          </DarkButton>
        </div>
      </article>
    </BoardOverlay>
  );
}

function QuestionPanel({
  form,
  formError,
  isError,
  isLoading,
  isSubmitting,
  isWriting,
  mutationError,
  onCancelWrite,
  onChangeForm,
  onSelect,
  onStartWrite,
  onSubmit,
  questions,
}: {
  form: QuestionFormState;
  formError: string;
  isError: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  isWriting: boolean;
  mutationError: unknown;
  onCancelWrite: () => void;
  onChangeForm: (form: QuestionFormState) => void;
  onSelect: (question: ContestQuestion) => void;
  onStartWrite: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  questions: ContestQuestion[];
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

      <QuestionList onSelect={onSelect} questions={questions} />

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
            formatApiError(mutationError, contestBoardText.questionSubmitError)
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
  questions,
  onSelect,
}: {
  questions: ContestQuestion[];
  onSelect: (question: ContestQuestion) => void;
}) {
  return (
    <ul className="divide-y divide-slate-200 border-y border-slate-200">
      {questions.map((question) => (
        <li key={question.contest_question_id}>
          <button
            className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-5 px-4 py-5 text-left transition hover:bg-slate-50"
            onClick={() => onSelect(question)}
            type="button"
          >
            <span className="flex min-w-0 flex-wrap items-center gap-3">
              <VisibilityBadge visibility={question.visibility} />
              <InfoPill>{contestBoardText.detailVisibilityQuestioner}</InfoPill>
              <strong className="min-w-0 text-base font-black break-keep text-slate-950 sm:truncate">
                {question.title}
              </strong>
            </span>
            <span className="shrink-0 text-sm font-medium text-slate-500">
              {question.author_name ?? contestBoardText.authorFallback} ·{' '}
              {formatDateTime(question.created_at)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function QuestionDetail({
  question,
  onClose,
}: {
  question: ContestQuestion;
  onClose: () => void;
}) {
  return (
    <BoardOverlay>
      <article className="grid w-full max-w-4xl gap-7 rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header className="grid gap-5">
          <h2 className="text-2xl font-black break-keep text-slate-950">
            {question.title}
          </h2>
          <div className="flex flex-wrap gap-2">
            <InfoPill>
              {question.author_name ?? contestBoardText.authorFallback}
            </InfoPill>
            <InfoPill>{formatDateTime(question.created_at)}</InfoPill>
          </div>
        </header>

        <div className="text-sm leading-7 whitespace-pre-wrap text-slate-950">
          {question.body}
        </div>

        {question.answers.length > 0 ? (
          <section className="grid gap-5 border-t border-slate-200 pt-6">
            {question.answers.map((answer) => (
              <article className="grid gap-4" key={answer.contest_answer_id}>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
                    {contestBoardText.answerBadge}
                  </span>
                  <InfoPill>{formatDateTime(answer.created_at)}</InfoPill>
                </div>
                <p className="text-sm leading-7 whitespace-pre-wrap text-slate-950">
                  {answer.body}
                </p>
              </article>
            ))}
          </section>
        ) : null}

        <div className="flex justify-end">
          <DarkButton onClick={onClose}>
            {contestBoardText.closeButton}
          </DarkButton>
        </div>
      </article>
    </BoardOverlay>
  );
}

function BoardOverlay({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-white/85 px-4 py-24 backdrop-blur-[1px]">
      {children}
    </div>
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
      className="h-9 rounded-md bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
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
      {({ contest }) => <ContestBoardContent contestId={contest.contest_id} />}
    </ContestPageShell>
  );
}
