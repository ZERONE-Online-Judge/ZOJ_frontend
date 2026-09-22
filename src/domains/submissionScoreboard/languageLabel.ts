import type { JudgeLanguage } from '@/domains/submissionScoreboard/types';

const LANGUAGE_LABELS: Record<JudgeLanguage, string> = {
  c99: 'C99',
  cpp17: 'C++17',
  python313: 'Python 3.13',
  java8: 'Java 8',
};

export function judgeLanguageLabel(language: string) {
  return Object.hasOwn(LANGUAGE_LABELS, language)
    ? LANGUAGE_LABELS[language as JudgeLanguage]
    : language;
}
