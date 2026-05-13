import { Link } from 'react-router-dom';

export type ContestNoticeSummary = {
  title: string;
  date: string;
  type: string;
};

export type ContestQuestionSummary = {
  title: string;
  author: string;
  status: string;
};

export type ContestActivityContent = {
  notices: ContestNoticeSummary[];
  questions: ContestQuestionSummary[];
};

type ContestActivityPanelProps = {
  content: ContestActivityContent;
  division: 'MOSS' | 'COSS';
};

export default function ContestActivityPanel({
  content,
  division,
}: ContestActivityPanelProps) {
  return (
    <aside className="flex flex-col gap-5">
      <section className="rounded border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-xl font-semibold text-slate-950">최근 공지사항</h2>
          <Link
            className="text-sm font-semibold text-zoj-blue"
            to={`/HEPC/${division}/notices`}
          >
            전체 보기
          </Link>
        </div>
        <ul className="divide-y divide-slate-200">
          {content.notices.slice(0, 6).map((notice) => (
            <li className="px-5 py-3" key={`${notice.type}-${notice.title}`}>
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                  {notice.type}
                </span>
                <span className="min-w-0 truncate text-sm font-semibold text-slate-950">
                  {notice.title}
                </span>
              </div>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {notice.date}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-xl font-semibold text-slate-950">질문 게시판</h2>
          <Link
            className="text-sm font-semibold text-zoj-blue"
            to={`/HEPC/${division}/board`}
          >
            전체 보기
          </Link>
        </div>
        <ul className="divide-y divide-slate-200">
          {content.questions.map((question) => (
            <li className="px-5 py-3" key={question.title}>
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-semibold text-slate-950">
                  {question.title}
                </span>
                <span className="shrink-0 rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                  {question.status}
                </span>
              </div>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {question.author}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
