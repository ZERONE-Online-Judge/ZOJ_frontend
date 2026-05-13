import { useState } from 'react';

export type ContestDetailItem = {
  label: string;
  value: string;
};

export type ContestDetailContent = {
  title: string;
  organization: string;
  division: string;
  status: string;
  summary: string;
  details: ContestDetailItem[];
};

type ContestDetailPanelProps = {
  content: ContestDetailContent;
};

export default function ContestDetailPanel({
  content,
}: ContestDetailPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="mx-6 mt-10 lg:mx-64">
      <div className="rounded border border-slate-200 bg-white">
        <button
          className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          <div>
            <p className="text-sm font-semibold text-slate-500">대회 상세 정보</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              {content.title}
            </h2>
          </div>
          <span className="bg-zoj-blue rounded px-3 py-1.5 text-xs font-semibold text-white">
            {isOpen ? '접기' : '펼치기'}
          </span>
        </button>

        {isOpen ? (
          <div className="border-t border-slate-200 px-6 py-5">
            <p className="text-sm leading-7 text-slate-600">
              {content.summary}
            </p>
            <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
              {content.details.map((detail) => (
                <div className="flex justify-between gap-4" key={detail.label}>
                  <dt className="text-sm font-semibold text-slate-500">
                    {detail.label}
                  </dt>
                  <dd className="text-right text-sm font-semibold text-slate-950">
                    {detail.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>
    </section>
  );
}
