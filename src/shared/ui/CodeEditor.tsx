import Editor from '@monaco-editor/react';
import { editorLanguageForJudgeLanguage } from '@/domains/problemManagement/document';

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
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <Editor
        height={editorHeight}
        language={editorLanguageForJudgeLanguage(language)}
        onChange={(nextValue) => onChange(nextValue ?? '')}
        options={{
          automaticLayout: true,
          fontSize: 14,
          lineHeight: 22,
          minimap: { enabled: false },
          readOnly: disabled,
          renderWhitespace: 'selection',
          scrollBeyondLastLine: false,
          tabSize: 2,
          wordWrap: 'on',
        }}
        theme="vs"
        value={value}
      />
    </div>
  );
}
