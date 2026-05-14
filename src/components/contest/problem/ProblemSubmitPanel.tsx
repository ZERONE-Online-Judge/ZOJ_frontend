import CodeEditor from '@/shared/ui/CodeEditor';
import PageNotice from '@/shared/ui/PageNotice';
import type { JudgeLanguage } from '@/domains/submissionScoreboard/types';

type ProblemSubmitPanelProps = {
  language: JudgeLanguage;
  sourceCode: string;
  isSubmitting: boolean;
  message: string;
  messageStatus: 'idle' | 'loading' | 'ready' | 'error';
  onLanguageChange: (language: JudgeLanguage) => void;
  onSourceCodeChange: (sourceCode: string) => void;
  onSubmit: () => void;
};

const languageOptions: { label: string; value: JudgeLanguage }[] = [
  { label: 'C++17', value: 'cpp17' },
  { label: 'Python 3.13', value: 'python313' },
  { label: 'Java 8', value: 'java8' },
  { label: 'C99', value: 'c99' },
];

export default function ProblemSubmitPanel({
  language,
  sourceCode,
  isSubmitting,
  message,
  messageStatus,
  onLanguageChange,
  onSourceCodeChange,
  onSubmit,
}: ProblemSubmitPanelProps) {
  return (
    <aside className="border-l border-slate-200 bg-white px-5 py-7">
      <h2 className="text-2xl font-black tracking-normal text-slate-950">
        제출
      </h2>

      <label className="mt-6 grid gap-2">
        <span className="sr-only">언어</span>
        <select
          className="h-11 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition outline-none focus:border-slate-400"
          onChange={(event) =>
            onLanguageChange(event.target.value as JudgeLanguage)
          }
          value={language}
        >
          {languageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-5">
        <CodeEditor
          disabled={isSubmitting}
          height={430}
          language={language}
          onChange={onSourceCodeChange}
          value={sourceCode}
        />
      </div>

      <button
        className="mt-4 flex h-11 w-full items-center justify-center rounded bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={isSubmitting || !sourceCode.trim()}
        onClick={onSubmit}
        type="button"
      >
        {isSubmitting ? '제출 중' : '제출하기'}
      </button>

      <div className="mt-4">
        <PageNotice message={message} status={messageStatus} />
      </div>
    </aside>
  );
}
