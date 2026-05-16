import { Suspense, lazy } from 'react';
import { editorLanguageForJudgeLanguage } from '@/domains/problemManagement/document';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

type CodeEditorProps = {
  value: string;
  language: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  height?: number | string;
};

export default function CodeEditor({
  value,
  language,
  onChange,
  disabled = false,
  height = 320,
}: CodeEditorProps) {
  const editorHeight = typeof height === 'number' ? `${height}px` : height;

  return (
    <div className="overflow-hidden rounded-md border border-slate-800 bg-slate-950 shadow-inner">
      <Suspense
        fallback={
          <div
            className="flex items-center justify-center text-sm font-semibold text-slate-400"
            style={{ height: editorHeight }}
          >
            코드 에디터를 불러오는 중입니다.
          </div>
        }
      >
        <MonacoEditor
          height={editorHeight}
          language={editorLanguageForJudgeLanguage(language)}
          onChange={(nextValue) => onChange(nextValue ?? '')}
          options={{
            automaticLayout: true,
            bracketPairColorization: { enabled: true },
            cursorBlinking: 'smooth',
            detectIndentation: false,
            fontSize: 14,
            fontFamily:
              'JetBrains Mono, Fira Code, Consolas, Menlo, Monaco, monospace',
            guides: {
              bracketPairs: true,
              indentation: true,
            },
            insertSpaces: true,
            lineHeight: 22,
            minimap: { enabled: false },
            overviewRulerBorder: false,
            padding: { top: 14, bottom: 14 },
            readOnly: disabled,
            renderLineHighlight: 'all',
            renderWhitespace: 'selection',
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            tabSize: 4,
            wordWrap: 'on',
          }}
          theme="vs-dark"
          value={value}
        />
      </Suspense>
    </div>
  );
}
