import { Link, useParams } from 'react-router-dom';
import FlowMarker from '@/components/common/FlowMarker';
import { publicNotices } from '@/data/testContent';

export default function PublicNoticeDetailPage() {
  const { noticeId } = useParams();
  const notice =
    publicNotices.find((item) => item.id === noticeId) ?? publicNotices[0];

  return (
    <main className="mx-6 my-16 flex flex-col gap-8 lg:mx-64">
      <FlowMarker>
        공지 상세 화면입니다. 목록에서 들어온 뒤 본문과 상태 메타 정보를
        확인하는 흐름을 보여줍니다.
      </FlowMarker>

      <article className="rounded border-2 border-amber-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
            {notice.label}
          </span>
          <time className="text-sm font-semibold text-slate-500">
            {notice.date}
          </time>
        </div>
        <h1 className="mt-5 text-4xl font-semibold text-slate-950">
          {notice.title}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          {notice.summary}
        </p>

        <div className="mt-8 flex flex-col gap-4 border-t border-slate-200 pt-8 text-sm leading-7 text-slate-700">
          {notice.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <Link
          className="mt-8 inline-flex rounded border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800"
          to="/board"
        >
          목록으로 돌아가기
        </Link>
      </article>
    </main>
  );
}
