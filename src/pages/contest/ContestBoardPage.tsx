import { useQuery } from '@tanstack/react-query';
import ContestPageFrame from '@/components/contest/ContestPageFrame';
import ContestPageShell from '@/components/contest/ContestPageShell';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';
import {
  getContestNotices,
  getContestQuestions,
} from '@/domains/serviceCommunication/api';
import { formatDateTime } from '@/shared/lib/dateTime';
import PageNotice from '@/shared/ui/PageNotice';

function ContestBoardContent({ contestId }: { contestId: string }) {
  const generalSession = useSessionStore((state) => state.generalSession);
  const token = generalSession?.accessToken;
  const noticesQuery = useQuery({
    queryKey: ['contest-notices', contestId, token],
    queryFn: () => getContestNotices(contestId, token),
    refetchInterval: 15_000,
  });
  const questionsQuery = useQuery({
    queryKey: ['contest-questions', contestId, token],
    queryFn: () => getContestQuestions(contestId, token),
    refetchInterval: 15_000,
  });
  const notices = noticesQuery.data ?? [];
  const questions = questionsQuery.data ?? [];

  return (
    <ContestPageFrame>
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="grid content-start gap-5">
          <header className="grid gap-2">
            <h2 className="text-2xl font-black text-slate-950">공지사항</h2>
            <p className="text-sm leading-6 text-slate-600">
              대회 운영 공지를 확인합니다.
            </p>
          </header>

          {noticesQuery.isLoading && (
            <PageNotice
              message="대회 공지를 불러오는 중입니다."
              status="loading"
            />
          )}
          {noticesQuery.isError && (
            <PageNotice
              message="대회 공지를 불러오지 못했습니다."
              status="error"
            />
          )}

          <ul className="grid gap-3">
            {notices.map((notice) => (
              <li
                className={
                  notice.emergency
                    ? 'rounded-md border border-red-200 bg-red-50 p-5'
                    : 'rounded-md border border-slate-200 bg-white p-5'
                }
                key={notice.contest_notice_id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {notice.pinned ? (
                    <span className="rounded bg-slate-950 px-2 py-1 text-xs font-bold text-white">
                      상단
                    </span>
                  ) : null}
                  {notice.emergency ? (
                    <span className="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white">
                      긴급
                    </span>
                  ) : null}
                  <time className="text-xs font-bold text-slate-500">
                    {formatDateTime(notice.published_at)}
                  </time>
                </div>
                <h3 className="mt-3 text-lg font-black text-slate-950">
                  {notice.title}
                </h3>
                <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-slate-700">
                  {notice.body}
                </p>
              </li>
            ))}
          </ul>

          {!noticesQuery.isLoading && notices.length === 0 ? (
            <PageNotice message="등록된 대회 공지가 없습니다." status="idle" />
          ) : null}
        </div>

        <div className="grid content-start gap-5">
          <header className="grid gap-2">
            <h2 className="text-2xl font-black text-slate-950">게시판</h2>
            <p className="text-sm leading-6 text-slate-600">
              질문과 운영자 답변을 확인합니다.
            </p>
          </header>

          {questionsQuery.isLoading && (
            <PageNotice
              message="게시글을 불러오는 중입니다."
              status="loading"
            />
          )}
          {questionsQuery.isError && (
            <PageNotice
              message="게시글을 불러오지 못했습니다."
              status="error"
            />
          )}

          <ul className="grid gap-3">
            {questions.map((question) => (
              <li
                className="rounded-md border border-slate-200 bg-white p-5"
                key={question.contest_question_id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                    {question.visibility === 'private' ? '비공개' : '공개'}
                  </span>
                  <time className="text-xs font-bold text-slate-500">
                    {formatDateTime(question.created_at)}
                  </time>
                </div>
                <h3 className="mt-3 text-lg font-black text-slate-950">
                  {question.title}
                </h3>
                <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-slate-700">
                  {question.body}
                </p>
                {question.answers.length > 0 ? (
                  <div className="mt-4 grid gap-2 border-l-4 border-blue-100 pl-4">
                    {question.answers.map((answer) => (
                      <p
                        className="text-sm leading-6 text-slate-600"
                        key={answer.contest_answer_id}
                      >
                        {answer.body}
                      </p>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          {!questionsQuery.isLoading && questions.length === 0 ? (
            <PageNotice message="등록된 질문이 없습니다." status="idle" />
          ) : null}
        </div>
      </section>
    </ContestPageFrame>
  );
}

export default function ContestBoardPage() {
  return (
    <ContestPageShell>
      {({ contest }) => <ContestBoardContent contestId={contest.contest_id} />}
    </ContestPageShell>
  );
}
