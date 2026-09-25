import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export function normalizeReportMarkdown(value: string) {
  return value
    .split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`+[^`]*`+)/g)
    .map((part) => {
      if (part.startsWith('```') || part.startsWith('~~~')) return part;
      if (part.startsWith('`')) {
        const text = part.replace(/^`+|`+$/g, '');
        // Old reports sometimes serialized a numeric test input as literal \n.
        // Never rewrite source-code string literals or arbitrary backslashes.
        if (/^\d+(?:[ \t]+\d+)*\\n/.test(text) && !/["';]/.test(text)) {
          const input = text.replace(/\\n/g, '\n');
          return (
            '\n\n```text\n' +
            input +
            (input.endsWith('\n') ? '' : '\n') +
            '```\n\n'
          );
        }
        return part;
      }
      return part
        .replace(
          /\\\[([\s\S]*?)\\\]/g,
          (_, math: string) => `\n$$\n${math}\n$$\n`,
        )
        .replace(/\\\(([\s\S]*?)\\\)/g, (_, math: string) => `$${math}$`);
    })
    .join('');
}

export default function VerificationMarkdown({
  children,
}: {
  children: string;
}) {
  return (
    <div className="verification-markdown min-w-0 text-sm leading-7 break-words [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden">
      <ReactMarkdown
        skipHtml
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [
            rehypeKatex,
            { throwOnError: false, trust: false, maxExpand: 1000, maxSize: 10 },
          ],
        ]}
        components={{
          p: ({ children }) => <p className="my-2">{children}</p>,
          pre: ({ children }) => (
            <pre
              tabIndex={0}
              className="my-2 max-h-80 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-xs leading-6 text-slate-100 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit"
            >
              {children}
            </pre>
          ),
          code: ({ children, className }) => (
            <code
              className={
                className ||
                'rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em] text-slate-900'
              }
            >
              {children}
            </code>
          ),
          ul: ({ children }) => (
            <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full border-collapse text-left [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:bg-slate-50 [&_th]:p-2">
                {children}
              </table>
            </div>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-700 underline"
            >
              {children}
            </a>
          ),
          img: ({ alt }) => <span>{alt || ''}</span>,
        }}
      >
        {normalizeReportMarkdown(children)}
      </ReactMarkdown>
    </div>
  );
}
