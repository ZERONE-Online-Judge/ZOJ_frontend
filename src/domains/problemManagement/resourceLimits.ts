import type { Problem } from '@/domains/problemManagement/types';
import type { JudgeLanguage } from '@/domains/submissionScoreboard/types';

const LANGUAGE_LABELS: Record<JudgeLanguage, string> = {
  c99: 'C',
  cpp17: 'C++',
  java8: 'Java',
  python313: 'Python',
};

const LANGUAGE_ORDER: JudgeLanguage[] = ['cpp17', 'python313', 'java8', 'c99'];

const LANGUAGE_TIME_ADJUSTMENTS: Partial<
  Record<JudgeLanguage, { multiplier: number; bonusMs: number }>
> = {
  java8: { multiplier: 2, bonusMs: 1000 },
  python313: { multiplier: 3, bonusMs: 2000 },
};

const LANGUAGE_MEMORY_ADJUSTMENTS: Partial<
  Record<JudgeLanguage, { multiplier: number; bonusMb: number }>
> = {
  java8: { multiplier: 2, bonusMb: 16 },
  python313: { multiplier: 2, bonusMb: 32 },
};

function formatTime(ms: number) {
  return ms % 1000 === 0 ? `${ms / 1000}s` : `${ms}ms`;
}

function formatMemory(memoryMb: number) {
  return `${memoryMb}MB`;
}

function effectiveTimeLimitMs(problem: Problem, language: JudgeLanguage) {
  const override = problem.language_resource_limits?.[language]?.time_limit_ms;
  if (override) return override;
  const adjustment = LANGUAGE_TIME_ADJUSTMENTS[language];
  if (!adjustment) return problem.time_limit_ms;
  return problem.time_limit_ms * adjustment.multiplier + adjustment.bonusMs;
}

function effectiveMemoryLimitMb(problem: Problem, language: JudgeLanguage) {
  const override = problem.language_resource_limits?.[language]?.memory_limit_mb;
  if (override) return override;
  const adjustment = LANGUAGE_MEMORY_ADJUSTMENTS[language];
  if (!adjustment) return problem.memory_limit_mb;
  return problem.memory_limit_mb * adjustment.multiplier + adjustment.bonusMb;
}

function limitSummary(
  problem: Problem,
  kind: 'memory_limit_mb' | 'time_limit_ms',
  formatter: (value: number) => string,
) {
  return LANGUAGE_ORDER.flatMap((language) => {
    const value =
      kind === 'time_limit_ms'
        ? effectiveTimeLimitMs(problem, language)
        : effectiveMemoryLimitMb(problem, language);
    const base =
      kind === 'time_limit_ms' ? problem.time_limit_ms : problem.memory_limit_mb;
    if (value === base) return [];
    return `${LANGUAGE_LABELS[language]} : ${formatter(value)}`;
  }).join(', ');
}

export function problemTimeLimitLabel(problem: Problem) {
  const overrides = limitSummary(problem, 'time_limit_ms', formatTime);
  return overrides
    ? `${formatTime(problem.time_limit_ms)} ( ${overrides} )`
    : formatTime(problem.time_limit_ms);
}

export function problemMemoryLimitLabel(problem: Problem) {
  const overrides = limitSummary(problem, 'memory_limit_mb', formatMemory);
  return overrides
    ? `${formatMemory(problem.memory_limit_mb)} ( ${overrides} )`
    : formatMemory(problem.memory_limit_mb);
}
