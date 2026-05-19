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
  listOperatorContestQuestions,
} from '@/domains/serviceCommunication/api';
import type { ContestQuestion } from '@/domains/serviceCommunication/types';
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
  const [selectedQuestionId, setSelectedQuestionId] = useState('');
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
          Number(a.answers.length === 0) - Number(b.answers.length === 0) ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [questionsQuery.data],
  );
  const selectedQuestion =
    questions.find(
      (question) => question.contest_question_id === selectedQuestionId,
    ) ??
    questions[0] ??
    null;

  const answerMutation = useMutation({
    mutationFn: () =>
      createContestAnswer(contestId, answerForm.questionId, token, {
        body: answerForm.body.trim(),
        visibility: answerForm.visibility,
      }),
    onSuccess: () => {
      setAnswerForm(emptyAnswerForm);
      setFormError('');
      void queryClient.invalidateQueries({
        queryKey: ['operator', 'boards', contestId],
      });
    },
  });

  function startAnswer(question: ContestQuestion) {
    setSelectedQuestionId(question.contest_question_id);
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

      <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.42fr)_minmax(0,1fr)]">
        <OperatorPanel
          description="답변이 필요한 질문을 우선 표시합니다."
          title="질문 목록"
        >
          <div className="grid auto-rows-fr gap-2">
            {questions.map((question) => (
              <button
                className={[
                  'grid h-28 content-start rounded border px-4 py-3 text-left transition',
                  selectedQuestion?.contest_question_id ===
                  question.contest_question_id
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50',
                ].join(' ')}
                key={question.contest_question_id}
                onClick={() =>
                  setSelectedQuestionId(question.contest_question_id)
                }
                type="button"
              >
                <span className="mb-2 flex flex-wrap gap-2">
                  <StatusBadge answered={question.answers.length > 0} />
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">
                    {question.visibility === 'private' ? '비공개' : '공개'}
                  </span>
                </span>
                <strong className="line-clamp-2 font-black text-slate-950">
                  {question.title}
                </strong>
                <span className="mt-1 line-clamp-1 text-xs font-bold text-slate-500">
                  {question.team_name ?? question.author_name ?? '참가자'} ·{' '}
                  {formatDateTime(question.created_at)}
                </span>
              </button>
            ))}
            {!questionsQuery.isLoading && questions.length === 0 ? (
              <p className="rounded border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-bold text-slate-500">
                표시할 질문이 없습니다.
              </p>
            ) : null}
          </div>
        </OperatorPanel>

        <OperatorPanel
          actions={
            selectedQuestion ? (
              <button
                className="inline-flex h-9 items-center gap-2 rounded bg-indigo-950 px-4 text-sm font-black text-white"
                onClick={() => startAnswer(selectedQuestion)}
                type="button"
              >
                <NoticeIcon />
                답변 작성
              </button>
            ) : null
          }
          description={
            selectedQuestion ? (
              <QuestionMeta question={selectedQuestion} />
            ) : undefined
          }
          title={selectedQuestion?.title ?? '질문 상세'}
        >
          {selectedQuestion ? (
            <div className="grid gap-5">
              <div className="rounded border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-sm leading-7 whitespace-pre-wrap text-slate-950">
                  {selectedQuestion.body}
                </p>
              </div>

              <section className="grid gap-3">
                <h3 className="text-sm font-black text-slate-700">답변</h3>
                {selectedQuestion.answers.map((answer) => (
                  <article
                    className="rounded border border-slate-200 px-4 py-3"
                    key={answer.contest_answer_id}
                  >
                    <div className="mb-2 flex flex-wrap gap-2 text-xs font-black text-slate-500">
                      <span>
                        {answer.visibility === 'public' ? '공개' : '질문자만'}
                      </span>
                      <span>{formatDateTime(answer.created_at)}</span>
                    </div>
                    <p className="text-sm leading-7 whitespace-pre-wrap text-slate-950">
                      {answer.body}
                    </p>
                  </article>
                ))}
                {selectedQuestion.answers.length === 0 ? (
                  <p className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                    아직 등록된 답변이 없습니다.
                  </p>
                ) : null}
              </section>

              {answerForm.questionId ===
              selectedQuestion.contest_question_id ? (
                <form className="grid gap-3" onSubmit={submitAnswer}>
                  <label className="grid gap-2 text-sm font-black text-slate-700">
                    공개 범위
                    <select
                      className="h-10 rounded border border-slate-200 px-3 text-sm font-bold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                      onChange={(event) =>
                        setAnswerForm((prev) => ({
                          ...prev,
                          visibility: event.target
                            .value as AnswerForm['visibility'],
                        }))
                      }
                      value={answerForm.visibility}
                    >
                      <option value="public">전체 공개</option>
                      <option value="questioner">질문자만</option>
                    </select>
                  </label>
                  <textarea
                    className="min-h-32 resize-y rounded border border-slate-200 px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    onChange={(event) =>
                      setAnswerForm((prev) => ({
                        ...prev,
                        body: event.target.value,
                      }))
                    }
                    value={answerForm.body}
                  />
                  {formError || answerMutation.error ? (
                    <ErrorBox
                      error={answerMutation.error}
                      fallback={formError || '답변 등록에 실패했습니다'}
                    />
                  ) : null}
                  <div className="flex justify-end gap-2">
                    <button
                      className="h-10 rounded border border-slate-200 px-4 text-sm font-black text-slate-600"
                      onClick={() => setAnswerForm(emptyAnswerForm)}
                      type="button"
                    >
                      취소
                    </button>
                    <button
                      className="h-10 rounded bg-indigo-950 px-4 text-sm font-black text-white disabled:bg-slate-300"
                      disabled={answerMutation.isPending}
                      type="submit"
                    >
                      {answerMutation.isPending ? '등록 중' : '답변 등록'}
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          ) : (
            <p className="text-sm font-bold text-slate-500">
              질문을 선택하세요.
            </p>
          )}
        </OperatorPanel>
      </div>
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
