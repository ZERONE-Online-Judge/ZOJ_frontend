import { Link, useParams } from 'react-router-dom';
import FlowMarker from '@/components/common/FlowMarker';
import { hepcQuestionDetailContent } from '@/data/testContent';

export default function HEPCQuestionDetailPage() {
  const { division = 'MOSS' } = useParams();
  const question = hepcQuestionDetailContent;

  return (
    <main className="mx-6 my-16 flex flex-col gap-6 lg:mx-64">
      <FlowMarker>
        질문 게시판 목록에서 들어오는 질문 상세 화면입니다. 참가자 질문과
        운영자 답변 상태를 함께 보여줍니다.
      </FlowMarker>

      <section className="rounded border-2 border-amber-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
            {question.problem}
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {question.status}
          </span>
        </div>
        <h1 className="mt-5 text-3xl font-semibold text-slate-950">
          {question.title}
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          {question.id} · {question.author}
        </p>

        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <article className="rounded border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-xl font-semibold text-slate-950">질문</h2>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {question.body}
            </p>
          </article>
          <article className="rounded border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-xl font-semibold text-amber-950">답변</h2>
            <p className="mt-3 text-sm leading-7 text-amber-900">
              {question.answer}
            </p>
          </article>
        </div>

        <Link
          className="mt-8 inline-flex rounded border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800"
          to={`/HEPC/${division}/board`}
        >
          질문 목록으로
        </Link>
      </section>
    </main>
  );
}
