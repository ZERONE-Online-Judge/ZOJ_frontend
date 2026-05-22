import { isJudgeLanguage } from '@/domains/submissionScoreboard/languagePreference';
import type { JudgeLanguage } from '@/domains/submissionScoreboard/types';

type CodeDraft = {
  language?: JudgeLanguage;
  sourceCode?: string;
};

const CODE_DRAFT_STORAGE_PREFIX = 'zoj.codeDraft';

function codeDraftStorageKey(scope: string, draftKey: string) {
  return `${CODE_DRAFT_STORAGE_PREFIX}.${encodeURIComponent(scope)}.${encodeURIComponent(draftKey)}`;
}

export function loadCodeDraft(scope: string, draftKey: string): CodeDraft | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(codeDraftStorageKey(scope, draftKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CodeDraft>;

    return {
      language: isJudgeLanguage(parsed.language) ? parsed.language : undefined,
      sourceCode:
        typeof parsed.sourceCode === 'string' ? parsed.sourceCode : undefined,
    };
  } catch {
    return null;
  }
}

export function saveCodeDraft(
  scope: string,
  draftKey: string,
  draft: CodeDraft,
) {
  if (typeof window === 'undefined') return;

  try {
    const previous = loadCodeDraft(scope, draftKey) ?? {};
    window.localStorage.setItem(
      codeDraftStorageKey(scope, draftKey),
      JSON.stringify({ ...previous, ...draft }),
    );
  } catch {
    // Draft persistence should never block editing.
  }
}
