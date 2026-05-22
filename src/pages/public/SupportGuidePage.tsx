import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import PageLayout, { PageHeading } from '@/components/common/PageLayout';
import { createPublicContactInquiry } from '@/domains/serviceCommunication/api';
import { supportSections, type SupportTabId } from '@/data/supportGuideContent';
import { publicPageText } from '@/data/uiText';
import { formatApiError } from '@/shared/api/errors';

const emptyContactForm = {
  body: '',
  senderEmail: '',
  senderName: '',
  title: '',
};

export default function SupportGuidePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = supportSections.some(
    (section) => section.id === searchParams.get('tab'),
  )
    ? (searchParams.get('tab') as SupportTabId)
    : 'guide';
  const [activeTab, setActiveTab] = useState<SupportTabId>(initialTab);
  const [contactForm, setContactForm] = useState(emptyContactForm);
  const [contactMessage, setContactMessage] = useState('');
  const activeSection =
    supportSections.find((section) => section.id === activeTab) ??
    supportSections[0];
  const isContactFormValid = Boolean(
    contactForm.title.trim() &&
      contactForm.senderName.trim() &&
      contactForm.senderEmail.trim() &&
      contactForm.body.trim(),
  );
  const contactMutation = useMutation({
    mutationFn: () =>
      createPublicContactInquiry({
        title: contactForm.title.trim(),
        sender_name: contactForm.senderName.trim(),
        sender_email: contactForm.senderEmail.trim(),
        body: contactForm.body.trim(),
      }),
    onSuccess: () => {
      setContactForm(emptyContactForm);
      setContactMessage(
        '문의가 접수되었습니다. 입력해주신 이메일 주소로 답변 드리겠습니다',
      );
    },
  });

  function changeTab(tabId: SupportTabId) {
    setActiveTab(tabId);
    setSearchParams(tabId === 'guide' ? {} : { tab: tabId });
  }

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (supportSections.some((section) => section.id === tab)) {
      setActiveTab(tab as SupportTabId);
    } else {
      setActiveTab('guide');
    }
  }, [searchParams]);

  return (
    <PageLayout
      description={publicPageText.support.description}
      eyebrow={publicPageText.support.eyebrow}
      title={publicPageText.support.title}
    >
      <div
        className="flex flex-wrap gap-2 border-b border-slate-200"
        role="tablist"
        aria-label={publicPageText.support.tabAriaLabel}
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
              onClick={() => changeTab(section.id)}
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

        {activeSection.id === 'contact' ? (
          <form
            className="grid gap-4 rounded-md border border-slate-200 bg-white p-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!isContactFormValid) return;
              setContactMessage('');
              contactMutation.mutate();
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <ContactInput
                label="제목"
                onChange={(value) =>
                  setContactForm((prev) => ({ ...prev, title: value }))
                }
                value={contactForm.title}
              />
              <ContactInput
                label="이름"
                onChange={(value) =>
                  setContactForm((prev) => ({ ...prev, senderName: value }))
                }
                value={contactForm.senderName}
              />
              <ContactInput
                label="이메일"
                onChange={(value) =>
                  setContactForm((prev) => ({ ...prev, senderEmail: value }))
                }
                type="email"
                value={contactForm.senderEmail}
              />
            </div>
            <label className="grid gap-2 text-sm font-black text-slate-700">
              본문
              <textarea
                className="min-h-44 resize-y rounded border border-slate-200 px-3 py-3 text-sm leading-6 font-bold text-slate-950 outline-none transition focus:border-zoj-blue focus:ring-4 focus:ring-zoj-blue/10"
                onChange={(event) =>
                  setContactForm((prev) => ({
                    ...prev,
                    body: event.target.value,
                  }))
                }
                required
                value={contactForm.body}
              />
            </label>
            <button
              className="h-11 w-fit rounded bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:bg-slate-300"
              disabled={!isContactFormValid || contactMutation.isPending}
              type="submit"
            >
              {contactMutation.isPending ? '접수 중' : '문의하기'}
            </button>
            {contactMessage ? (
              <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                {contactMessage}
              </p>
            ) : null}
            {contactMutation.error ? (
              <p className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                {formatApiError(contactMutation.error, '문의 접수에 실패했습니다')}
              </p>
            ) : null}
          </form>
        ) : (
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
        )}
      </article>
    </PageLayout>
  );
}

function ContactInput({
  label,
  onChange,
  type = 'text',
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-slate-700">
      {label}
      <input
        className="h-11 rounded border border-slate-200 px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-zoj-blue focus:ring-4 focus:ring-zoj-blue/10"
        onChange={(event) => onChange(event.target.value)}
        required
        type={type}
        value={value}
      />
    </label>
  );
}
