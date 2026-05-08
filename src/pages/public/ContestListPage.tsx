import { Link } from 'react-router-dom';
import FlowMarker from '@/components/common/FlowMarker';
import PageInfoSection from '@/components/common/PageInfoSection';
import ContestCard from '@/components/ui/ContestCard';
import { publicContests, publicPageContent } from '@/data/testContent';

export default function ContestListPage() {
  return (
    <>
      <main className="mx-6 my-16 flex flex-col gap-8 lg:mx-64">
        <FlowMarker>
          공개 대회 목록에서 대회 상세와 참가자 로그인으로 이어지는 플로우를
          시각적으로 추가했습니다.
        </FlowMarker>

        <section className="rounded border-2 border-amber-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-700">
                Public contest flow
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">
                대회 목록
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                대회 카드는 상세 보기와 참가자 로그인으로 나뉘어 이동합니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm font-semibold">
              {['전체', '접수 중', '진행 예정', '종료'].map((filter) => (
                <span
                  className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700"
                  key={filter}
                >
                  {filter}
                </span>
              ))}
            </div>
          </div>

          <ul className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-6">
            {publicContests.map((contest) => (
              <ContestCard
                className="md:col-span-6"
                key={contest.title}
                {...contest}
              />
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              className="bg-zoj-blue rounded px-4 py-3 text-sm font-semibold text-white"
              to="/contests/hepc"
            >
              HEPC 공개 상세 보기
            </Link>
            <Link
              className="rounded border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800"
              to="/HEPC_login"
            >
              참가자 로그인
            </Link>
          </div>
        </section>
      </main>

      <PageInfoSection content={publicPageContent.contestList} />
    </>
  );
}
