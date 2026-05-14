import type { Problem } from '@/domains/problemManagement/types';

type ProblemMetaPillsProps = {
  problem: Problem;
};

export default function ProblemMetaPills({ problem }: ProblemMetaPillsProps) {
  return (
    <dl className="flex flex-wrap gap-2">
      <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700">
        <dt className="inline">시간 </dt>
        <dd className="inline">{problem.time_limit_ms / 1000}s</dd>
      </div>
      <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700">
        <dt className="inline">메모리 </dt>
        <dd className="inline">{problem.memory_limit_mb}MB</dd>
      </div>
      <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700">
        <dt className="inline">점수 </dt>
        <dd className="inline">{problem.max_score}</dd>
      </div>
    </dl>
  );
}
