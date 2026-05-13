import { Link } from 'react-router-dom';

export type ProblemStatus =
  | 'waiting'
  | 'preparing'
  | 'judging'
  | 'accepted'
  | 'wrong_answer'
  | 'compile_error'
  | 'runtime_error'
  | 'time_limit_exceeded'
  | 'memory_limit_exceeded'
  | 'no_submission';

export type ProblemStatusItem = {
  code: string;
  title: string;
  maxScore: number;
  status: ProblemStatus;
  attempts: number;
  lastResult: string;
  href: string;
};

export type ProblemStatusContent = {
  title: string;
  description: string;
  problems: ProblemStatusItem[];
};

type ProblemStatusPanelProps = {
  content: ProblemStatusContent;
};

const statusLabel = {
  waiting: '대기 중',
  preparing: '채점 준비 중',
  judging: '채점 중',
  accepted: '맞았습니다',
  wrong_answer: '틀렸습니다',
  compile_error: '컴파일 에러',
  runtime_error: '런타임 에러',
  time_limit_exceeded: '시간 초과',
  memory_limit_exceeded: '메모리 초과',
  no_submission: '미제출',
} satisfies Record<ProblemStatus, string>;

const statusClassName = {
  waiting: 'text-sky-700',
  preparing: 'text-indigo-700',
  judging: 'text-zoj-blue',
  accepted: 'text-emerald-700',
  wrong_answer: 'text-red-700',
  compile_error: 'text-orange-700',
  runtime_error: 'text-rose-700',
  time_limit_exceeded: 'text-amber-700',
  memory_limit_exceeded: 'text-violet-700',
  no_submission: 'text-slate-500',
} satisfies Record<ProblemStatus, string>;

const progressStatuses = ['waiting', 'preparing', 'judging'] as const;
const finalStatuses = [
  'accepted',
  'wrong_answer',
  'compile_error',
  'runtime_error',
  'time_limit_exceeded',
  'memory_limit_exceeded',
] as const;

function StatusChip({ status }: { status: ProblemStatus }) {
  return (
    <span
      className={`${statusClassName[status]} rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold`}
    >
      {statusLabel[status]}
    </span>
  );
}

export default function ProblemStatusPanel({
  content,
}: ProblemStatusPanelProps) {
  return (
    <section>
      <div className="rounded border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-2xl font-semibold text-slate-950">
            {content.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {content.description}
          </p>

          <div className="mt-5 flex flex-col gap-3">
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500">
                진행 상태
              </p>
              <div className="flex flex-wrap gap-2">
                {progressStatuses.map((status) => (
                  <StatusChip key={status} status={status} />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500">
                주요 최종 판정
              </p>
              <div className="flex flex-wrap gap-2">
                {finalStatuses.map((status) => (
                  <StatusChip key={status} status={status} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {content.problems.map((problem) => (
            <Link
              className="grid grid-cols-[48px_1fr_auto] items-center gap-4 px-6 py-4 transition hover:bg-amber-50"
              key={problem.code}
              to={problem.href}
            >
              <span className="text-base font-bold text-slate-950">
                {problem.code}
              </span>
              <span className="min-w-0 truncate text-sm font-semibold text-slate-900">
                {problem.title}
              </span>
              <span
                className={`${statusClassName[problem.status]} text-sm font-semibold`}
              >
                {statusLabel[problem.status]}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
