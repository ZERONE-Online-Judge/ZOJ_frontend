import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';

import { resolveAssetSource } from '@/domains/problemManagement/document';
import type { ProblemAsset } from '@/domains/problemManagement/types';

type MarkdownPreviewProps = {
  statement: string;
  assets?: ProblemAsset[];
};

function normalizeMathDelimiters(markdown: string) {
  return markdown
    .split(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g)
    .map((part) => {
      if (part.startsWith('```') || part.startsWith('~~~')) return part;

      return part
        .replace(
          /\\\[([\s\S]*?)\\\]/g,
          (_, math: string) => `$$\n${math.trim()}\n$$`,
        )
        .replace(/\\\(([\s\S]*?)\\\)/g, (_, math: string) => `$${math}$`);
    })
    .join('');
}

export default function MarkdownPreview({
  statement,
  assets = [],
}: MarkdownPreviewProps) {
  const normalizedStatement = normalizeMathDelimiters(statement);
  const renderImage = (src = '', alt = '') => {
    const resolvedSrc = src ? resolveAssetSource(src, assets) : '';
    if (!resolvedSrc) return null;

    return (
      <img
        alt={alt}
        className="max-h-96 rounded-md border border-slate-200 object-contain"
        src={resolvedSrc}
      />
    );
  };

  return (
    <div className="prose prose-slate max-w-none text-slate-800">
      <ReactMarkdown
        components={{
          img: ({ src = '', alt = '' }) => renderImage(src, alt),
          ul: ({ children }) => (
            <ul className="my-4 list-disc space-y-2 pl-6 leading-7">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 list-decimal space-y-2 pl-6 leading-7">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="pl-1 marker:font-black marker:text-slate-500">
              {children}
            </li>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-md border border-slate-200 bg-slate-950 p-4 text-sm text-slate-50">
              {children}
            </pre>
          ),
          code: ({ children }) => (
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.92em] text-slate-900">
              {children}
            </code>
          ),
        }}
        rehypePlugins={[[rehypeKatex, { throwOnError: false }]]}
        remarkPlugins={[remarkGfm, remarkMath]}
      >
        {normalizedStatement}
      </ReactMarkdown>
    </div>
  );
}
