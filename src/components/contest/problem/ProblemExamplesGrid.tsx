import type { ProblemExample } from '@/domains/problemManagement/types';
import { SvgIcon } from '@/utils/Icons';

type ProblemExamplesGridProps = {
  examples: ProblemExample[];
};

function ExampleBox({ title, value }: { title: string; value: string }) {
  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <header className="flex h-10 items-center justify-between bg-slate-100 px-4 text-xs font-black text-slate-700">
        <span>{title}</span>
        <button
          aria-label={`${title} 복사`}
          className="flex size-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 transition hover:text-slate-950"
          onClick={() => void navigator.clipboard?.writeText(value)}
          type="button"
        >
          <SvgIcon name="clipboard" size={14} />
        </button>
      </header>
      <pre className="min-h-24 px-4 py-3 font-mono text-sm leading-6 whitespace-pre-wrap text-slate-950">
        {value}
      </pre>
    </section>
  );
}

export default function ProblemExamplesGrid({
  examples,
}: ProblemExamplesGridProps) {
  if (examples.length === 0) return null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {examples.map((example, index) => (
        <div className="contents" key={`${example.input}-${index}`}>
          <ExampleBox title={`예제 입력 ${index + 1}`} value={example.input} />
          <ExampleBox title={`예제 출력 ${index + 1}`} value={example.output} />
        </div>
      ))}
    </div>
  );
}
