import { useState, useEffect } from 'react';
import { resolveStatementLanguage } from './statementLanguages';

const preferenceKey = 'zoj.problem-statement-language';
const changeEvent = 'zoj-statement-language-change';
export function useStatementLanguage(languages: string[], fallback: string) {
  const [preferred, setPreferred] = useState(() => {
    try {
      return typeof window === 'undefined'
        ? ''
        : window.localStorage.getItem(preferenceKey) || '';
    } catch {
      return '';
    }
  });
  const selected = resolveStatementLanguage(preferred, languages, fallback);
  useEffect(() => {
    const changed = (event: Event) => {
      const language = (event as CustomEvent<string>).detail;
      if (typeof language === 'string') setPreferred(language);
    };
    const stored = (event: StorageEvent) => {
      if (event.key === preferenceKey) setPreferred(event.newValue || '');
    };
    window.addEventListener(changeEvent, changed);
    window.addEventListener('storage', stored);
    return () => {
      window.removeEventListener(changeEvent, changed);
      window.removeEventListener('storage', stored);
    };
  }, []);
  const select = (language: string) => {
    setPreferred(language);
    try {
      window.localStorage.setItem(preferenceKey, language);
    } catch {
      /* Viewing remains available without browser storage. */
    }
    window.dispatchEvent(
      new window.CustomEvent(changeEvent, { detail: language }),
    );
  };
  return [selected, select] as const;
}
