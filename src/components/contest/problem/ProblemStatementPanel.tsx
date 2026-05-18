import { parseProblemDocument } from '@/domains/problemManagement/document';
import type { Problem } from '@/domains/problemManagement/types';
import MarkdownPreview from '@/shared/ui/MarkdownPreview';
import ProblemExamplesGrid from '@/components/contest/problem/ProblemExamplesGrid';
import ProblemMetaPills from '@/components/contest/problem/ProblemMetaPills';

type ProblemStatementPanelProps = {
  problem: Problem;
};

export default function ProblemStatementPanel({
  problem,
}: ProblemStatementPanelProps) {
  const document = parseProblemDocument(problem.statement);

  return (
    <article className="min-w-0 bg-white px-8 py-7">
      <header>
        <h1 className="text-3xl font-black tracking-normal text-slate-950">
          {problem.problem_code}. {problem.title}
        </h1>
        <div className="mt-5">
          <ProblemMetaPills problem={problem} />
        </div>
      </header>

      <div className="mt-7">
        <MarkdownPreview statement={document.statement} />
      </div>

      {document.inputDescription ? (
        <section className="mt-10">
          <h2 className="text-2xl font-black tracking-normal text-slate-950">
            입력
          </h2>
          <div className="mt-4">
            <MarkdownPreview statement={document.inputDescription} />
          </div>
        </section>
      ) : null}

      {document.outputDescription ? (
        <section className="mt-10">
          <h2 className="text-2xl font-black tracking-normal text-slate-950">
            출력
          </h2>
          <div className="mt-4">
            <MarkdownPreview statement={document.outputDescription} />
          </div>
        </section>
      ) : null}

      {document.note ? (
        <section className="mt-10">
          <h2 className="text-2xl font-black tracking-normal text-slate-950">
            노트
          </h2>
          <div className="mt-4">
            <MarkdownPreview statement={document.note} />
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <ProblemExamplesGrid examples={document.examples} />
      </section>
    </article>
  );
}
