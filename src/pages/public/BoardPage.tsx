import { Link } from 'react-router-dom';
import FlowMarker from '@/components/common/FlowMarker';
import PageInfoSection from '@/components/common/PageInfoSection';
import { publicNotices, publicPageContent } from '@/data/testContent';

export default function BoardPage() {
  return (
    <>
      <main className="mx-6 my-16 flex flex-col gap-8 lg:mx-64">
        <FlowMarker>
          서비스 공지 목록에서 상세 화면으로 들어가는 공개 게시판 플로우를
          추가했습니다.
        </FlowMarker>

        <section className="rounded border-2 border-amber-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-950">
            서비스 공지 게시판
          </h1>
          <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
            {publicNotices.map((notice) => (
              <Link
                className="grid gap-2 px-4 py-5 transition hover:bg-amber-50 md:grid-cols-[120px_1fr_120px]"
                key={notice.id}
                to={`/board/${notice.id}`}
              >
                <span className="text-sm font-semibold text-amber-700">
                  {notice.label}
                </span>
                <span>
                  <span className="block font-semibold text-slate-950">
                    {notice.title}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-slate-600">
                    {notice.summary}
                  </span>
                </span>
                <time className="text-sm font-medium text-slate-500">
                  {notice.date}
                </time>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <PageInfoSection content={publicPageContent.board} />
    </>
  );
}
