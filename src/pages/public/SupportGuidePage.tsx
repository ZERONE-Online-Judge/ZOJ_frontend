import { useState } from 'react';
import PageLayout, { PageHeading } from '@/components/common/PageLayout';
import { supportSections, type SupportTabId } from '@/data/supportGuideContent';

export default function SupportGuidePage() {
  const [activeTab, setActiveTab] = useState<SupportTabId>('rules');
  const activeSection =
    supportSections.find((section) => section.id === activeTab) ??
    supportSections[0];

  return (
    <PageLayout
      description="문의, 서비스 도움말, 규정을 한 곳에서 확인합니다."
      eyebrow="Support"
      title="지원 안내"
    >
      <div
        className="flex flex-wrap gap-2 border-b border-slate-200"
        role="tablist"
        aria-label="지원 안내 탭"
      >
        {supportSections.map((section) => {
          const active = section.id === activeTab;

          return (
            <button
              aria-controls={`support-panel-${section.id}`}
              aria-selected={active}
              className={[
                'min-w-24 border-b-2 px-4 py-3 text-sm font-bold transition',
                active
                  ? 'border-zoj-blue text-zoj-blue'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-950',
              ].join(' ')}
              id={`support-tab-${section.id}`}
              key={section.id}
              onClick={() => setActiveTab(section.id)}
              role="tab"
              type="button"
            >
              {section.label}
            </button>
          );
        })}
      </div>

      <article
        aria-labelledby={`support-tab-${activeSection.id}`}
        className="grid gap-6"
        id={`support-panel-${activeSection.id}`}
        role="tabpanel"
      >
        <PageHeading
          description={activeSection.description}
          eyebrow={activeSection.eyebrow}
          level={2}
          title={activeSection.title}
          variant="section"
        />

        <div className="grid gap-4 md:grid-cols-2">
          {activeSection.groups.map((group) => (
            <section
              className="rounded-md border border-slate-200 bg-white p-5"
              key={group.title}
            >
              <h3 className="text-lg font-bold text-slate-950">
                {group.title}
              </h3>
              <ul className="mt-4 grid list-disc gap-2 pl-5 text-sm leading-6 text-slate-700">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </article>
    </PageLayout>
  );
}
