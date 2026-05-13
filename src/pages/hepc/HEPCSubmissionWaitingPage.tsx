import { Link, useParams } from 'react-router-dom';
import FlowMarker from '@/components/common/FlowMarker';
import { hepcSubmissionWaitingContent } from '@/data/testContent';

export default function HEPCSubmissionWaitingPage() {
  const { division = 'MOSS', submissionId } = useParams();

  return (
    <main className="mx-6 my-16 flex flex-col gap-6 lg:mx-64">
      <FlowMarker>
        제출 직후 채점 상태를 기다리는 화면입니다. 실제 API 연결 시 polling 또는
        SSE로 갱신될 영역입니다.
      </FlowMarker>

      <section className="rounded border-2 border-amber-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-slate-500">
          제출 {submissionId ?? hepcSubmissionWaitingContent.id}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          {hepcSubmissionWaitingContent.title}
        </h1>
        <div className="mt-8 flex flex-col gap-4">
          {hepcSubmissionWaitingContent.steps.map((step, index) => (
            <div
              className="flex items-center gap-4 rounded border border-slate-200 bg-slate-50 p-4"
              key={step}
            >
              <span
                className={[
                  'flex size-8 items-center justify-center rounded-full text-sm font-bold',
                  index < 2
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-100 text-amber-800',
                ].join(' ')}
              >
                {index + 1}
              </span>
              <span className="font-semibold text-slate-950">{step}</span>
            </div>
          ))}
        </div>
        <Link
          className="bg-zoj-blue mt-8 inline-flex rounded px-4 py-3 text-sm font-semibold text-white"
          to={`/HEPC/${division}/submissions/${submissionId ?? hepcSubmissionWaitingContent.id}`}
        >
          제출 상세로 이동
        </Link>
      </section>
    </main>
  );
}
