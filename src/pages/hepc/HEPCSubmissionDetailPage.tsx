import { Link, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import FlowMarker from '@/components/common/FlowMarker';
import { hepcSubmissionDetailContent } from '@/data/testContent';

export default function HEPCSubmissionDetailPage() {
  const { division = 'MOSS', submissionId } = useParams();
  const submission = {
    ...hepcSubmissionDetailContent,
    id: submissionId ?? hepcSubmissionDetailContent.id,
  };

  return (
    <main className="mx-6 my-16 flex flex-col gap-6 lg:mx-64">
      <FlowMarker>
        내 제출 목록에서 들어오는 제출 상세 화면입니다. 최종 판정, 로그, 제출
        소스 확인 영역을 추가했습니다.
      </FlowMarker>

      <section className="rounded border-2 border-amber-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">
              제출 {submission.id}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">
              {submission.problem}
            </h1>
          </div>
          <Link
            className="rounded border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800"
            to={`/HEPC/${division}/submissions/${submission.id}/wait`}
          >
            채점 대기 화면 보기
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            ['언어', submission.language],
            ['제출 시각', submission.submittedAt],
            ['진행 상태', submission.progressStatus],
            ['최종 판정', submission.finalResult],
            ['점수', submission.score],
          ].map(([label, value]) => (
            <div
              className="rounded border border-slate-200 bg-slate-50 p-4"
              key={label}
            >
              <p className="text-xs font-semibold text-slate-500">{label}</p>
              <p className="mt-2 text-base font-semibold text-slate-950">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded border border-slate-200 p-5">
            <h2 className="text-xl font-semibold text-slate-950">채점 로그</h2>
            <p className="mt-3 rounded bg-slate-50 p-3 text-sm text-slate-700">
              {submission.compileLog}
            </p>
            <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm text-slate-700">
              {submission.judgeLog.map((log) => (
                <li key={log}>{log}</li>
              ))}
            </ul>
          </section>

          <section className="overflow-hidden rounded border border-slate-200">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-xl font-semibold text-slate-950">
                제출 소스
              </h2>
            </div>
            <Editor
              height="360px"
              language="python"
              options={{ readOnly: true, minimap: { enabled: false } }}
              theme="vs-light"
              value={submission.source}
            />
          </section>
        </div>
      </section>
    </main>
  );
}
