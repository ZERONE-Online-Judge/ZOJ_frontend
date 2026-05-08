import { useState } from 'react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import FlowMarker from '@/components/common/FlowMarker';
import { hepcProblemDetailContent } from '@/data/testContent';

function MarkdownBlock({ children }: { children: string }) {
  return (
    <div className="space-y-4 text-sm leading-7 text-slate-700">
      <ReactMarkdown
        rehypePlugins={[rehypeKatex]}
        remarkPlugins={[remarkGfm, remarkMath]}
        components={{
          h2: ({ children: heading }) => (
            <h2 className="mt-8 text-2xl font-semibold text-slate-950">
              {heading}
            </h2>
          ),
          p: ({ children: paragraph }) => <p>{paragraph}</p>,
          ul: ({ children: list }) => (
            <ul className="list-disc space-y-1 pl-5">{list}</ul>
          ),
          ol: ({ children: list }) => (
            <ol className="list-decimal space-y-1 pl-5">{list}</ol>
          ),
          code: ({ children: code }) => (
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm text-slate-950">
              {code}
            </code>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

function getEditorLanguage(language: string) {
  if (language.includes('Python')) {
    return 'python';
  }

  if (language.includes('Java')) {
    return 'java';
  }

  if (language.includes('C')) {
    return 'cpp';
  }

  return 'plaintext';
}

export default function HEPCProblemPage() {
  const problem = hepcProblemDetailContent;
  const [language, setLanguage] = useState(problem.allowedLanguages[1]);
  const [sourceCode, setSourceCode] = useState(problem.defaultSource);

  return (
    <main className="mx-6 my-16 flex flex-col gap-6 lg:mx-64">
      <FlowMarker>
        문제 상세에서 코드 제출 후 채점 대기 화면으로 이어지는 참가자 풀이
        플로우를 추가했습니다.
      </FlowMarker>

      <section className="overflow-hidden rounded border-2 border-amber-200 bg-white shadow-sm">
        <div className="bg-zoj-blue px-8 py-7 text-white">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            문제 {problem.code}
          </span>
          <h1 className="mt-4 text-4xl font-semibold">{problem.title}</h1>
          <p className="mt-3 text-sm leading-6 text-white/80">
            Markdown과 LaTeX가 렌더링되는 문제 상세 예시입니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 p-8 xl:grid-cols-[2fr_1fr]">
          <article className="flex flex-col gap-8">
            <section>
              <h2 className="text-2xl font-semibold text-slate-950">
                문제 설명
              </h2>
              <div className="mt-4">
                <MarkdownBlock>{problem.statementMarkdown}</MarkdownBlock>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950">입력</h2>
              <div className="mt-4">
                <MarkdownBlock>{problem.inputMarkdown}</MarkdownBlock>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950">출력</h2>
              <div className="mt-4">
                <MarkdownBlock>{problem.outputMarkdown}</MarkdownBlock>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950">예제</h2>
              <div className="mt-4 flex flex-col gap-5">
                {problem.examples.map((example, index) => (
                  <div
                    className="rounded border border-slate-200 bg-slate-50 p-4"
                    key={`${example.input}-${index}`}
                  >
                    <p className="text-sm font-semibold text-slate-950">
                      예제 {index + 1}
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <label className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
                        입력
                        <textarea
                          className="min-h-24 resize-y rounded border border-slate-200 bg-white p-3 font-mono text-sm font-normal text-slate-700"
                          readOnly
                          value={example.input}
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
                        출력
                        <textarea
                          className="min-h-24 resize-y rounded border border-slate-200 bg-white p-3 font-mono text-sm font-normal text-slate-700"
                          readOnly
                          value={example.output}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950">제약</h2>
              <div className="mt-4">
                <MarkdownBlock>{problem.constraintsMarkdown}</MarkdownBlock>
              </div>
            </section>
          </article>

          <aside className="flex flex-col gap-6">
            <section className="rounded border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-xl font-semibold text-slate-950">
                문제 정보
              </h2>
              <dl className="mt-5 grid grid-cols-1 gap-4 text-sm">
                {problem.infoItems.map((item) => (
                  <div
                    className="flex items-center justify-between gap-4"
                    key={item.label}
                  >
                    <dt className="font-semibold text-slate-500">
                      {item.label}
                    </dt>
                    <dd className="text-right font-semibold text-slate-950">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="rounded border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-xl font-semibold text-amber-950">
                제출 상태 예시
              </h2>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                제출 버튼을 누른 뒤에는 제출 접수, 채점 대기, 최종 판정 화면으로
                이어집니다.
              </p>
            </section>

            <section className="rounded border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-semibold text-slate-950">
                소스코드 제출
              </h2>
              <label className="mt-5 flex flex-col gap-2 text-sm font-semibold text-slate-700">
                언어
                <select
                  className="rounded border border-slate-300 px-3 py-2 font-normal"
                  onChange={(event) => setLanguage(event.target.value)}
                  value={language}
                >
                  {problem.allowedLanguages.map((allowedLanguage) => (
                    <option key={allowedLanguage}>{allowedLanguage}</option>
                  ))}
                </select>
              </label>

              <div className="mt-4 overflow-hidden rounded border border-slate-300">
                <Editor
                  height="360px"
                  language={getEditorLanguage(language)}
                  onChange={(value) => setSourceCode(value ?? '')}
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                  }}
                  theme="vs-light"
                  value={sourceCode}
                />
              </div>

              <Link
                className="bg-zoj-blue mt-4 block w-full rounded px-4 py-3 text-center text-sm font-semibold text-white"
                to="/HEPC/MOSS/submissions/S-1040/wait"
              >
                제출하기
              </Link>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
