import FlowMarker from '@/components/common/FlowMarker';
import PageInfoSection from '@/components/common/PageInfoSection';
import {
  contactFormMockContent,
  publicPageContent,
} from '@/data/testContent';

export default function ContactPage() {
  return (
    <>
      <main className="mx-6 my-16 flex flex-col gap-8 lg:mx-64">
        <FlowMarker>
          문의 입력, 접수 완료, 오류 상태까지 디자이너가 볼 수 있도록 공개 문의
          플로우를 추가했습니다.
        </FlowMarker>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <form className="rounded border-2 border-amber-200 bg-white p-6 shadow-sm">
            <h1 className="text-3xl font-semibold text-slate-950">문의하기</h1>
            <div className="mt-6 grid grid-cols-1 gap-4">
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                주최 기관
                <input
                  className="rounded border border-slate-300 px-4 py-3 font-normal"
                  placeholder="Hanyang University ERICA"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                담당자 이메일
                <input
                  className="rounded border border-slate-300 px-4 py-3 font-normal"
                  placeholder="organizer@example.com"
                  type="email"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                문의 유형
                <select className="rounded border border-slate-300 px-4 py-3 font-normal">
                  {contactFormMockContent.types.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                문의 내용
                <textarea
                  className="min-h-36 rounded border border-slate-300 px-4 py-3 font-normal"
                  placeholder="대회 규모, 예상 일정, 필요한 기능을 적어주세요."
                />
              </label>
              <button
                className="bg-zoj-blue rounded px-5 py-3 text-sm font-semibold text-white"
                type="button"
              >
                문의 보내기
              </button>
            </div>
          </form>

          <aside className="flex flex-col gap-4">
            {contactFormMockContent.stateExamples.map((state) => (
              <div
                className="rounded border border-amber-200 bg-amber-50 p-5"
                key={state.title}
              >
                <h2 className="text-lg font-semibold text-amber-950">
                  {state.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-amber-900">
                  {state.body}
                </p>
              </div>
            ))}
          </aside>
        </section>
      </main>

      <PageInfoSection content={publicPageContent.contact} />
    </>
  );
}
