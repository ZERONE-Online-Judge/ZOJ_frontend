import { Link, useParams } from 'react-router-dom';
import FlowMarker from '@/components/common/FlowMarker';
import { hepcNoticeDetailContent } from '@/data/testContent';

export default function HEPCNoticeDetailPage() {
  const { division = 'MOSS' } = useParams();
  const notice = hepcNoticeDetailContent;

  return (
    <main className="mx-6 my-16 flex flex-col gap-6 lg:mx-64">
      <FlowMarker>
        대회 공지 목록에서 들어오는 공지 상세 화면입니다. 긴급 공지와 일반
        공지의 본문 확인 흐름을 보여줍니다.
      </FlowMarker>

      <article className="rounded border-2 border-amber-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white">
            {notice.type}
          </span>
          <time className="text-sm font-semibold text-slate-500">
            {notice.date}
          </time>
        </div>
        <h1 className="mt-5 text-4xl font-semibold text-slate-950">
          {notice.title}
        </h1>
        <div className="mt-8 flex flex-col gap-4 border-t border-slate-200 pt-8 text-sm leading-7 text-slate-700">
          {notice.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <Link
          className="mt-8 inline-flex rounded border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800"
          to={`/HEPC/${division}/notices`}
        >
          공지 목록으로
        </Link>
      </article>
    </main>
  );
}
