import { Link, useParams } from 'react-router-dom';
import FlowMarker from '@/components/common/FlowMarker';

export default function HEPCQuestionWritePage() {
  const { division = 'MOSS' } = useParams();

  return (
    <main className="mx-6 my-16 flex flex-col gap-6 lg:mx-64">
      <FlowMarker>
        질문 작성 화면입니다. 실제 저장 API가 붙기 전까지 작성 필드와 제출 후
        상태를 디자인 검토용으로 보여줍니다.
      </FlowMarker>

      <section className="rounded border-2 border-amber-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-950">새 질문 작성</h1>
        <div className="mt-6 grid grid-cols-1 gap-5">
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            관련 문제
            <select className="rounded border border-slate-300 px-4 py-3 font-normal">
              {['전체', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].map(
                (code) => (
                  <option key={code}>{code}</option>
                ),
              )}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            제목
            <input
              className="rounded border border-slate-300 px-4 py-3 font-normal"
              placeholder="예: C번 입력 범위 확인 부탁드립니다"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            내용
            <textarea
              className="min-h-48 rounded border border-slate-300 px-4 py-3 font-normal"
              placeholder="문제 번호, 예제 번호, 의심되는 조건을 구체적으로 적어주세요."
            />
          </label>
          <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
            제출 후에는 대기 중 상태로 표시되고, 운영자 답변이 달리면 답변 완료로
            변경됩니다.
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="bg-zoj-blue rounded px-5 py-3 text-sm font-semibold text-white"
              type="button"
            >
              질문 등록
            </button>
            <Link
              className="rounded border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800"
              to={`/HEPC/${division}/board`}
            >
              취소
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
