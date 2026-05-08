import FlowMarker from '@/components/common/FlowMarker';
import PageInfoSection from '@/components/common/PageInfoSection';
import { publicPageContent } from '@/data/testContent';

const ruleSections = [
  {
    title: '참가 규정',
    body: '참가자는 등록된 팀 계정으로만 대회에 참가하며, 계정 공유와 외부 코드 공유는 금지됩니다.',
  },
  {
    title: '제출 규정',
    body: '대회 시간 안에 제출된 코드만 공식 결과에 반영됩니다. 제출 언어와 컴파일 옵션은 대회 공지에서 확인합니다.',
  },
  {
    title: '스코어보드 규정',
    body: '운영 정책에 따라 종료 전 일정 시간 동안 스코어보드가 프리즈될 수 있습니다.',
  },
  {
    title: '이의제기',
    body: '판정 이의제기와 문제 설명 문의는 대회 내부 질문 게시판을 통해 접수합니다.',
  },
];

export default function RulesPage() {
  return (
    <>
      <main className="mx-6 my-16 flex flex-col gap-8 lg:mx-64">
        <FlowMarker>
          공개 규정 화면에 목차와 본문 예시를 추가했습니다. 대회 내부 규정집과
          같은 구조로 재사용할 수 있습니다.
        </FlowMarker>

        <section className="rounded border-2 border-amber-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-950">규정 안내</h1>
          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
            <nav className="rounded border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-500">목차</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm font-semibold text-slate-800">
                {ruleSections.map((section) => (
                  <li key={section.title}>{section.title}</li>
                ))}
              </ul>
            </nav>
            <div className="flex flex-col gap-4">
              {ruleSections.map((section) => (
                <article
                  className="rounded border border-slate-200 p-5"
                  key={section.title}
                >
                  <h2 className="text-xl font-semibold text-slate-950">
                    {section.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {section.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PageInfoSection content={publicPageContent.rules} />
    </>
  );
}
