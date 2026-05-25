import { type FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AdminAccessGate,
  AdminPanel,
  AdminTabs,
} from '@/components/admin/AdminShell';
import PageLayout from '@/components/common/PageLayout';
import {
  answerAdminContactInquiry,
  listAdminContactInquiries,
} from '@/domains/serviceCommunication/api';
import { tokenQueryIdentity } from '@/domains/identityAccess/queryIdentity';
import { formatApiError } from '@/shared/api/errors';
import { formatDateTime } from '@/shared/lib/dateTime';
import useDocumentVisibility from '@/shared/hooks/useDocumentVisibility';

export default function AdminInquiriesPage() {
  return (
    <AdminAccessGate>
      {(session) => <AdminInquiriesContent token={session.accessToken} />}
    </AdminAccessGate>
  );
}

function AdminInquiriesContent({ token }: { token: string }) {
  const isVisible = useDocumentVisibility();
  const queryClient = useQueryClient();
  const queryIdentity = tokenQueryIdentity(token);
  const [expandedId, setExpandedId] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const inquiriesQuery = useQuery({
    queryKey: ['admin', 'contact-inquiries', queryIdentity],
    queryFn: () => listAdminContactInquiries(token),
    refetchInterval: isVisible ? 30_000 : false,
  });

  const answerMutation = useMutation({
    mutationFn: ({
      answerBody,
      inquiryId,
    }: {
      answerBody: string;
      inquiryId: string;
    }) =>
      answerAdminContactInquiry(inquiryId, token, {
        answer_body: answerBody,
      }),
    onSuccess: (inquiry) => {
      setAnswers((prev) => ({ ...prev, [inquiry.contact_inquiry_id]: '' }));
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'contact-inquiries'],
      });
    },
  });

  const inquiries = inquiriesQuery.data ?? [];
  const pendingCount = inquiries.filter(
    (inquiry) => inquiry.status !== 'answered',
  ).length;

  function submitAnswer(event: FormEvent<HTMLFormElement>, inquiryId: string) {
    event.preventDefault();
    const answerBody = (answers[inquiryId] ?? '').trim();
    if (!answerBody) return;
    answerMutation.mutate({ answerBody, inquiryId });
  }

  return (
    <PageLayout
      description="서비스 문의를 최근순으로 확인하고 답변 메일을 발송합니다."
      eyebrow="Service Master"
      title="문의 관리"
      width="full"
    >
      <AdminTabs />

      {inquiriesQuery.error ? (
        <div className="rounded border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
          {formatApiError(inquiriesQuery.error, '문의 목록을 불러오지 못했습니다')}
        </div>
      ) : null}

      <AdminPanel
        description={`최근 접수된 문의입니다. 답변 필요 ${pendingCount.toLocaleString('ko-KR')}건`}
        title="서비스 문의"
      >
        <div className="divide-y divide-slate-100 rounded border border-slate-200">
          {inquiries.length > 0 ? (
            inquiries.map((inquiry) => {
              const expanded = expandedId === inquiry.contact_inquiry_id;
              return (
                <article key={inquiry.contact_inquiry_id}>
                  <button
                    className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-violet-50/40"
                    onClick={() =>
                      setExpandedId(expanded ? '' : inquiry.contact_inquiry_id)
                    }
                    type="button"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={inquiry.status} />
                        <strong
                          className="zoj-break-anywhere min-w-0 text-base font-black text-slate-950"
                          title={inquiry.title}
                        >
                          {inquiry.title}
                        </strong>
                      </span>
                      <span className="zoj-break-anywhere mt-1 block text-sm font-bold text-slate-500">
                        {inquiry.sender_name} · {inquiry.sender_email} ·{' '}
                        {formatDateTime(inquiry.created_at)}
                      </span>
                    </span>
                    <span className="text-sm font-black text-violet-700">
                      {expanded ? '접기' : '보기'}
                    </span>
                  </button>

                  {expanded ? (
                    <div className="grid gap-5 border-t border-slate-100 bg-slate-50/50 px-4 py-5">
                      <InquiryBlock label="문의 본문" value={inquiry.body} />
                      {inquiry.answer_body ? (
                        <div className="grid gap-3">
                          <InquiryBlock
                            label="답변 내역"
                            value={inquiry.answer_body}
                          />
                          <p className="zoj-break-anywhere text-xs font-bold text-slate-500">
                            {inquiry.answered_by_email ?? '-'} ·{' '}
                            {inquiry.answered_at
                              ? formatDateTime(inquiry.answered_at)
                              : '-'}
                          </p>
                        </div>
                      ) : null}

                      <form
                        className="grid gap-3"
                        onSubmit={(event) =>
                          submitAnswer(event, inquiry.contact_inquiry_id)
                        }
                      >
                        <label className="grid gap-2 text-sm font-black text-slate-700">
                          답변 작성
                          <textarea
                            className="min-h-32 resize-y rounded border border-slate-200 bg-white px-3 py-3 text-sm leading-6 font-bold text-slate-950 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                            onChange={(event) =>
                              setAnswers((prev) => ({
                                ...prev,
                                [inquiry.contact_inquiry_id]:
                                  event.target.value,
                              }))
                            }
                            value={answers[inquiry.contact_inquiry_id] ?? ''}
                          />
                        </label>
                        <button
                          className="h-10 w-fit rounded bg-violet-950 px-4 text-sm font-black text-white transition hover:bg-violet-800 disabled:bg-slate-300"
                          disabled={
                            answerMutation.isPending ||
                            !(answers[inquiry.contact_inquiry_id] ?? '').trim()
                          }
                          type="submit"
                        >
                          {answerMutation.isPending ? '발송 중' : '답변 발송'}
                        </button>
                        {answerMutation.error ? (
                          <p className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                            {formatApiError(
                              answerMutation.error,
                              '답변 발송에 실패했습니다',
                            )}
                          </p>
                        ) : null}
                      </form>
                    </div>
                  ) : null}
                </article>
              );
            })
          ) : (
            <p className="px-4 py-10 text-center text-sm font-bold text-slate-500">
              접수된 문의가 없습니다.
            </p>
          )}
        </div>
      </AdminPanel>
    </PageLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const answered = status === 'answered';
  return (
    <span
      className={[
        'rounded-full px-3 py-1 text-xs font-black',
        answered
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-amber-50 text-amber-700',
      ].join(' ')}
    >
      {answered ? '답변완료' : '답변필요'}
    </span>
  );
}

function InquiryBlock({ label, value }: { label: string; value: string }) {
  return (
    <section className="grid min-w-0 gap-2">
      <h3 className="text-sm font-black text-slate-700">{label}</h3>
      <div className="zoj-break-anywhere whitespace-pre-wrap rounded border border-slate-200 bg-white px-4 py-3 text-sm leading-6 font-bold text-slate-700">
        {value}
      </div>
    </section>
  );
}
