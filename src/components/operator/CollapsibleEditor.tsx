import { useId, type ReactNode } from 'react';

export default function CollapsibleEditor({
  title,
  description,
  children,
  open,
  onOpenChange,
  draft = false,
  busy = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft?: boolean;
  busy?: boolean;
}) {
  const id = useId();
  return (
    <section
      className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white"
      aria-labelledby={`${id}-title`}
    >
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-body`}
          aria-label={`${title} ${open ? '접기' : '펼치기'}`}
          disabled={busy}
          onClick={() => onOpenChange(!open)}
          className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-60 sm:px-5"
        >
          <span className="grid min-w-0 flex-1 gap-1">
            <span
              id={`${id}-title`}
              className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900"
            >
              {title}
              {draft ? (
                <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                  작성 중
                </span>
              ) : null}
            </span>
            <span className="text-xs leading-5 font-normal text-slate-600">
              {description}
            </span>
          </span>
          <span className="shrink-0 text-xs font-semibold text-indigo-700">
            {open ? '접기' : '펼치기'}
          </span>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={`size-4 shrink-0 text-slate-500 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          >
            <path d="m5 7.5 5 5 5-5" />
          </svg>
        </button>
      </h2>
      <div id={`${id}-body`} hidden={!open}>
        <div className="border-t border-slate-100 p-4 sm:p-5">{children}</div>
      </div>
    </section>
  );
}
