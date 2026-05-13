import { Link, useParams } from 'react-router-dom';
import FlowMarker from '@/components/common/FlowMarker';
import { hepcWorkspacePageContent } from '@/data/testContent';

type Division = 'MOSS' | 'COSS';
type Section = keyof typeof hepcWorkspacePageContent;

function StatusText({ value }: { value: string }) {
  const color =
    value === 'accepted'
      ? 'text-emerald-700'
      : value === 'judging'
        ? 'text-zoj-blue'
        : value === 'compile_error'
          ? 'text-orange-700'
          : value === 'wrong_answer'
            ? 'text-red-700'
            : 'text-slate-700';

  return <span className={`${color} font-semibold`}>{value}</span>;
}

function ScoreboardSection() {
  const content = hepcWorkspacePageContent.scoreboard;
  const problemCodes = 'ABCDEFGHIJK'.split('');

  return (
    <section className="rounded border-2 border-amber-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-950">
              {content.title}
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {content.description}
            </p>
          </div>
          <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            <p className="font-semibold text-amber-950">
              {content.frozen ? '프리즈 적용 중' : '실시간 반영'}
            </p>
            <p className="mt-1 text-xs font-medium text-amber-800">
              생성 시각: {content.generatedAt}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
            <tr>
              <th className="px-4 py-3">순위</th>
              <th className="px-4 py-3">팀</th>
              <th className="px-4 py-3">해결</th>
              <th className="px-4 py-3">패널티</th>
              {problemCodes.map((code) => (
                <th className="px-3 py-3 text-center" key={code}>
                  {code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {content.rows.map((row) => (
              <tr key={row.team}>
                <td className="px-4 py-4 font-semibold text-slate-950">
                  {row.rank}
                </td>
                <td className="px-4 py-4 font-semibold text-slate-950">
                  {row.team}
                </td>
                <td className="px-4 py-4">{row.solved}</td>
                <td className="px-4 py-4">{row.penalty}</td>
                {row.problems.map((result, index) => (
                  <td
                    className="px-3 py-4 text-center"
                    key={`${row.team}-${index}`}
                  >
                    {result}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SubmissionsSection({ division }: { division: Division }) {
  const content = hepcWorkspacePageContent.submissions;

  return (
    <section className="rounded border-2 border-amber-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-6">
        <h1 className="text-3xl font-semibold text-slate-950">
          {content.title}
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          {content.description}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
            <tr>
              <th className="px-4 py-3">제출 ID</th>
              <th className="px-4 py-3">문제</th>
              <th className="px-4 py-3">언어</th>
              <th className="px-4 py-3">제출 시각</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">점수</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {content.rows.map((row) => (
              <tr className="hover:bg-amber-50" key={row.id}>
                <td className="px-4 py-4 font-semibold text-slate-950">
                  <Link to={`/HEPC/${division}/submissions/${row.id}`}>
                    {row.id}
                  </Link>
                </td>
                <td className="px-4 py-4">{row.problem}</td>
                <td className="px-4 py-4">{row.language}</td>
                <td className="px-4 py-4">{row.submittedAt}</td>
                <td className="px-4 py-4">
                  <StatusText value={row.status} /> / {row.result}
                </td>
                <td className="px-4 py-4">{row.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function NoticesSection({ division }: { division: Division }) {
  const content = hepcWorkspacePageContent.notices;

  return (
    <section className="rounded border-2 border-amber-200 bg-white p-6 shadow-sm">
      <h1 className="text-3xl font-semibold text-slate-950">{content.title}</h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        {content.description}
      </p>
      <div className="mt-8 flex flex-col gap-4">
        {content.rows.map((notice) => (
          <Link
            className="rounded border border-slate-200 bg-slate-50 p-5 transition hover:border-amber-300 hover:bg-amber-50"
            key={notice.title}
            to={`/HEPC/${division}/notices/${notice.id}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white">
                {notice.type}
              </span>
              <time className="text-xs font-medium text-slate-500">
                {notice.date}
              </time>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-slate-950">
              {notice.title}
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {notice.body}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function BoardSection({ division }: { division: Division }) {
  const content = hepcWorkspacePageContent.board;

  return (
    <section className="rounded border-2 border-amber-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-950">
            {content.title}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {content.description}
          </p>
        </div>
        <Link
          className="bg-zoj-blue rounded px-4 py-3 text-sm font-semibold text-white"
          to={`/HEPC/${division}/board/new`}
        >
          새 질문 작성
        </Link>
      </div>

      <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
        {content.rows.map((question) => (
          <Link
            className="grid gap-2 px-4 py-5 transition hover:bg-amber-50 md:grid-cols-[80px_1fr_120px_140px]"
            key={question.id}
            to={`/HEPC/${division}/board/${question.id}`}
          >
            <span className="font-semibold text-slate-950">
              {question.problem}
            </span>
            <span>
              <span className="block font-semibold text-slate-950">
                {question.title}
              </span>
              <span className="mt-1 block text-sm text-slate-500">
                {question.author} · {question.createdAt}
              </span>
            </span>
            <span className="text-sm font-semibold text-amber-700">
              {question.status}
            </span>
            <span className="text-sm font-medium text-slate-500">
              {question.id}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function RulesSection() {
  const content = hepcWorkspacePageContent.rules;

  return (
    <section className="rounded border-2 border-amber-200 bg-white p-6 shadow-sm">
      <h1 className="text-3xl font-semibold text-slate-950">{content.title}</h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        {content.description}
      </p>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {content.sections.map((section) => (
          <article
            className="rounded border border-slate-200 bg-slate-50 p-5"
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
    </section>
  );
}

export default function HEPCWorkspaceSubPage() {
  const { division: divisionParam, section: sectionParam } = useParams();
  const division: Division = divisionParam === 'COSS' ? 'COSS' : 'MOSS';
  const section = (sectionParam ?? 'scoreboard') as Section;

  return (
    <main className="mx-6 my-16 flex flex-col gap-6 lg:mx-64">
      <FlowMarker>
        대회 내부의 스코어보드, 내 제출, 공지사항, 질문 게시판, 규정집 화면을
        실제 클릭 가능한 플로우로 확장했습니다.
      </FlowMarker>
      <p className="text-sm font-semibold text-slate-500">HEPC {division}</p>
      {section === 'scoreboard' ? <ScoreboardSection /> : null}
      {section === 'submissions' ? (
        <SubmissionsSection division={division} />
      ) : null}
      {section === 'notices' ? <NoticesSection division={division} /> : null}
      {section === 'board' ? <BoardSection division={division} /> : null}
      {section === 'rules' ? <RulesSection /> : null}
    </main>
  );
}
