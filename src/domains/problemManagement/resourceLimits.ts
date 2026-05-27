import type { Problem } from '@/domains/problemManagement/types';
import type { JudgeLanguage } from '@/domains/submissionScoreboard/types';

const LANGUAGE_LABELS: Record<JudgeLanguage, string> = {
  c99: 'C',
  cpp17: 'C++',
  java8: 'Java',
  python313: 'Python',
};

const LANGUAGE_ORDER: JudgeLanguage[] = ['cpp17', 'python313', 'java8', 'c99'];

function formatTime(ms: number) {
  return ms % 1000 === 0 ? `${ms / 1000}s` : `${ms}ms`;
}

function formatMemory(memoryMb: number) {
  return `${memoryMb}MB`;
}

function overrideSummary(
  problem: Problem,
  kind: 'memory_limit_mb' | 'time_limit_ms',
  formatter: (value: number) => string,
) {
  return LANGUAGE_ORDER.flatMap((language) => {
    const value = problem.language_resource_limits?.[language]?.[kind];
    if (!value) return [];
    return `${LANGUAGE_LABELS[language]} : ${formatter(value)}`;
  }).join(', ');
}

export function problemTimeLimitLabel(problem: Problem) {
  const overrides = overrideSummary(problem, 'time_limit_ms', formatTime);
  return overrides
    ? `${formatTime(problem.time_limit_ms)} ( ${overrides} )`
    : formatTime(problem.time_limit_ms);
}

export function problemMemoryLimitLabel(problem: Problem) {
  const overrides = overrideSummary(problem, 'memory_limit_mb', formatMemory);
  return overrides
    ? `${formatMemory(problem.memory_limit_mb)} ( ${overrides} )`
    : formatMemory(problem.memory_limit_mb);
}
