import FlowMarker from '@/components/common/FlowMarker';
import PageInfoSection from '@/components/common/PageInfoSection';
import {
  publicJudgeStatusContent,
  publicPageContent,
} from '@/data/testContent';

export default function JudgeStatusPage() {
  return (
    <>
      <main className="mx-6 my-16 flex flex-col gap-8 lg:mx-64">
        <FlowMarker>
          공개 채점 상태의 정상/지연/장애 상태를 디자인에서 확인할 수 있도록
          실제 카드형 대시보드를 추가했습니다.
        </FlowMarker>

        <section className="rounded border-2 border-amber-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                {publicJudgeStatusContent.overall}
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">
                공개 채점 상태
              </h1>
            </div>
            <p className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
              마지막 갱신 {publicJudgeStatusContent.updatedAt}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            {publicJudgeStatusContent.metrics.map((metric) => (
              <div
                className="rounded border border-slate-200 bg-slate-50 p-5"
                key={metric.label}
              >
                <p className="text-xs font-semibold text-slate-500">
                  {metric.label}
                </p>
                <p className="mt-3 text-2xl font-semibold text-slate-950">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded border border-slate-200 bg-amber-50 p-5">
            <h2 className="text-lg font-semibold text-slate-950">
              최근 상태 이벤트
            </h2>
            <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm leading-6 text-slate-700">
              {publicJudgeStatusContent.events.map((event) => (
                <li key={event}>{event}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <PageInfoSection content={publicPageContent.judgeStatus} />
    </>
  );
}
