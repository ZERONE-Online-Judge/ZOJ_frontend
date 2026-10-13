import { parseProblemDocument } from '@/domains/problemManagement/document';
import type { Problem, ProblemAsset } from '@/domains/problemManagement/types';
import MarkdownPreview from '@/shared/ui/MarkdownPreview';
import ProblemExamplesGrid from '@/components/contest/problem/ProblemExamplesGrid';
import ProblemMetaPills from '@/components/contest/problem/ProblemMetaPills';
import { statementVersions } from '@/domains/problemManagement/statementLanguages';
import StatementLanguageSelect from './StatementLanguageSelect';
import { useStatementLanguage } from '@/domains/problemManagement/useStatementLanguage';

type ProblemStatementPanelProps = {
  assets?: ProblemAsset[];
  problem: Problem;
};

export default function ProblemStatementPanel({
  assets = [],
  problem,
}: ProblemStatementPanelProps) {
  const versions = statementVersions(problem);
  const defaultLanguage = problem.default_statement_language || 'ko';
  const [language, selectLanguage] = useStatementLanguage(
    Object.keys(versions),
    defaultLanguage,
  );
  const variant = versions[language];
  const document = parseProblemDocument(variant.statement);

  return (
    <article
      lang={language}
      className="zoj-problem-document min-w-0 bg-white px-4 py-5 sm:px-6 sm:py-6"
    >
      <header>
        <h1 className="text-3xl font-black tracking-normal text-slate-950">
          {problem.problem_code}. {variant.title || problem.title}
        </h1>
        <div className="mt-5">
          <ProblemMetaPills problem={problem} />
        </div>
        <StatementLanguageSelect
          languages={Object.keys(versions)}
          selected={language}
          defaultLanguage={defaultLanguage}
          onChange={selectLanguage}
        />
      </header>

      <div className="mt-7">
        <MarkdownPreview assets={assets} statement={document.statement} />
      </div>

      {document.inputDescription ? (
        <section className="mt-10">
          <h2 className="text-2xl font-black tracking-normal text-slate-950">
            입력
          </h2>
          <div className="mt-4">
            <MarkdownPreview
              assets={assets}
              statement={document.inputDescription}
            />
          </div>
        </section>
      ) : null}

      {document.outputDescription ? (
        <section className="mt-10">
          <h2 className="text-2xl font-black tracking-normal text-slate-950">
            출력
          </h2>
          <div className="mt-4">
            <MarkdownPreview
              assets={assets}
              statement={document.outputDescription}
            />
          </div>
        </section>
      ) : null}

      {document.note ? (
        <section className="mt-10">
          <h2 className="text-2xl font-black tracking-normal text-slate-950">
            노트
          </h2>
          <div className="mt-4">
            <MarkdownPreview assets={assets} statement={document.note} />
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <ProblemExamplesGrid
          assets={assets}
          examples={
            document.examples.length
              ? document.examples
              : parseProblemDocument(problem.statement).examples
          }
        />
      </section>
    </article>
  );
}
