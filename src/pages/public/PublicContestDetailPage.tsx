import { Link } from 'react-router-dom';
import FlowMarker from '@/components/common/FlowMarker';
import { publicContestDetailContent } from '@/data/testContent';

export default function PublicContestDetailPage() {
  const contest = publicContestDetailContent;

  return (
    <main className="mx-6 my-16 flex flex-col gap-8 lg:mx-64">
      <FlowMarker>
        대회 목록에서 들어오는 공개 대회 상세 화면입니다. 참가 전 정보 확인과
        로그인 진입 버튼을 분리했습니다.
      </FlowMarker>

      <section className="overflow-hidden rounded border-2 border-amber-200 bg-white shadow-sm">
        <div className="bg-zoj-blue px-8 py-8 text-white">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            {contest.status}
          </span>
          <h1 className="mt-4 text-4xl font-semibold">{contest.title}</h1>
          <p className="mt-3 text-sm font-semibold text-white/80">
            {contest.organization}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-[1.6fr_0.8fr]">
          <article>
            <h2 className="text-2xl font-semibold text-slate-950">
              대회 소개
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              {contest.description}
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              {contest.notices.map((notice) => (
                <div
                  className="rounded border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-950"
                  key={notice}
                >
                  {notice}
                </div>
              ))}
            </div>
          </article>

          <aside className="rounded border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-xl font-semibold text-slate-950">대회 정보</h2>
            <dl className="mt-5 flex flex-col gap-4 text-sm">
              <div>
                <dt className="font-semibold text-slate-500">대회 기간</dt>
                <dd className="mt-1 font-semibold text-slate-950">
                  {contest.period}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">접수 기간</dt>
                <dd className="mt-1 font-semibold text-slate-950">
                  {contest.registration}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Division</dt>
                <dd className="mt-1 font-semibold text-slate-950">
                  {contest.divisions.join(', ')}
                </dd>
              </div>
            </dl>

            <Link
              className="bg-zoj-blue mt-6 block rounded px-4 py-3 text-center text-sm font-semibold text-white"
              to="/HEPC_login"
            >
              참가자 로그인으로 이동
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
