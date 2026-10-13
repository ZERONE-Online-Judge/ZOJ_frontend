import type { Problem } from './types';
import { parseProblemDocument } from '@/domains/problemManagement/document';

export const statementLanguageLabels: Record<string, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '中文',
  'zh-Hans': '简体中文',
  'zh-Hant': '繁體中文',
  ru: 'Русский',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  pt: 'Português',
};
export const statementLanguageLabel = (language: string) =>
  statementLanguageLabels[language] || language;
export function statementVersions(problem: Problem) {
  return {
    [problem.default_statement_language || 'ko']: {
      title: problem.title,
      statement: problem.statement,
    },
    ...Object.fromEntries(
      Object.entries(problem.statement_translations || {}).filter(([, item]) =>
        parseProblemDocument(item.statement).statement.trim(),
      ),
    ),
  };
}
export function editorialVersions(problem: Problem) {
  const values = {
    [problem.default_statement_language || 'ko']: problem.editorial || '',
    ...problem.editorial_translations,
  };
  const populated = Object.fromEntries(
    Object.entries(values).filter(([, body]) => body.trim()),
  );
  return Object.keys(populated).length
    ? populated
    : { [problem.default_statement_language || 'ko']: '' };
}
export function hasProblemEditorial(problem: Problem) {
  return Boolean(
    problem.editorial?.trim() ||
    Object.values(problem.editorial_translations || {}).some((body) =>
      body.trim(),
    ),
  );
}
export function resolveStatementLanguage(
  preferred: string,
  languages: string[],
  fallback: string,
) {
  return languages.includes(preferred)
    ? preferred
    : languages.includes(fallback)
      ? fallback
      : languages[0] || fallback;
}

export function promoteStatementLanguage(
  problem: Problem,
  language: string,
): Problem {
  const current = problem.default_statement_language || 'ko';
  if (current === language) return problem;
  const target = problem.statement_translations?.[language];
  if (!target && !problem.editorial_translations?.[language])
    return { ...problem, default_statement_language: language };
  const translations = {
    ...problem.statement_translations,
    [current]: { title: problem.title, statement: problem.statement },
  };
  const editorials = {
    ...problem.editorial_translations,
    [current]: problem.editorial || '',
  };
  const editorial = editorials[language] || '';
  delete translations[language];
  delete editorials[language];
  return {
    ...problem,
    default_statement_language: language,
    title: target?.title || problem.title,
    statement: target?.statement || problem.statement,
    editorial,
    statement_translations: translations,
    editorial_translations: editorials,
  };
}
