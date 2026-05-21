import { type FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AdminAccessGate,
  AdminMetricCard,
  AdminPanel,
  AdminTabs,
  DashboardIcon,
  JudgeIcon,
  NoticeIcon,
} from '@/components/admin/AdminShell';
import PageLayout from '@/components/common/PageLayout';
import { getAdminDashboard } from '@/domains/auditMonitoring/api';
import {
  createAdminServiceNotice,
  deleteAdminServiceNotice,
  listAdminServiceNotices,
} from '@/domains/serviceCommunication/api';
import { tokenQueryIdentity } from '@/domains/identityAccess/queryIdentity';
import { formatDateTime } from '@/shared/lib/dateTime';
import { formatApiError } from '@/shared/api/errors';
import AnimatedNumber from '@/shared/ui/AnimatedNumber';
import useDocumentVisibility from '@/shared/hooks/useDocumentVisibility';

type NoticeFormState = {
  body: string;
  emergency: boolean;
  summary: string;
  title: string;
};

const emptyNoticeForm: NoticeFormState = {
  body: '',
  emergency: false,
  summary: '',
  title: '',
};

const NOTICE_PAGE_SIZE = 20;

export default function AdminHomePage() {
  return (
    <AdminAccessGate>
      {(session) => <AdminHomeContent token={session.accessToken} />}
    </AdminAccessGate>
  );
}

function Pagination({
  currentPage,
  onChange,
  totalPages,
}: {
  currentPage: number;
  onChange: (page: number) => void;
  totalPages: number;
}) {
  return (
    <nav className="mt-4 flex flex-wrap items-center justify-center gap-2">
      {Array.from({ length: totalPages }, (_, index) => index + 1).map(
        (page) => (
          <button
            className={[
              'h-9 min-w-9 rounded border px-3 text-sm font-black transition',
              currentPage === page
                ? 'border-slate-950 bg-slate-950 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            ].join(' ')}
            key={page}
            onClick={() => onChange(page)}
            type="button"
          >
            {page}
          </button>
        ),
      )}
    </nav>
  );
}

function AdminHomeContent({ token }: { token: string }) {
  const isVisible = useDocumentVisibility();
  const queryClient = useQueryClient();
  const queryIdentity = tokenQueryIdentity(token);
  const [form, setForm] = useState<NoticeFormState>(emptyNoticeForm);
  const [formError, setFormError] = useState('');
  const [expandedNoticeId, setExpandedNoticeId] = useState('');
  const [noticePage, setNoticePage] = useState(1);

  const dashboardQuery = useQuery({
    queryKey: ['admin', 'dashboard', queryIdentity],
    queryFn: () => getAdminDashboard(token),
    refetchInterval: isVisible ? 15_000 : false,
  });

  const noticesQuery = useQuery({
    queryKey: ['admin', 'service-notices', queryIdentity],
    queryFn: () => listAdminServiceNotices(token),
    refetchInterval: isVisible ? 30_000 : false,
  });
  const serviceNotices = noticesQuery.data ?? [];
  const totalNoticePages = Math.max(
    1,
    Math.ceil(serviceNotices.length / NOTICE_PAGE_SIZE),
  );
  const pagedServiceNotices = serviceNotices.slice(
    (noticePage - 1) * NOTICE_PAGE_SIZE,
    noticePage * NOTICE_PAGE_SIZE,
  );

  const createNoticeMutation = useMutation({
    mutationFn: () =>
      createAdminServiceNotice(token, {
        body: form.body.trim(),
        emergency: form.emergency,
        summary: form.summary.trim(),
        title: form.title.trim(),
      }),
    onSuccess: () => {
      setForm(emptyNoticeForm);
      setFormError('');
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'service-notices'],
      });
    },
  });

  const deleteNoticeMutation = useMutation({
    mutationFn: (noticeId: string) => deleteAdminServiceNotice(noticeId, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'service-notices'],
      });
      void queryClient.invalidateQueries({ queryKey: ['public-service-notices'] });
    },
  });

  function removeNotice(noticeId: string, title: string) {
    const confirmed = window.confirm(
      `"${title}" 서비스 공지를 삭제할까요? 삭제한 공지는 복구할 수 없습니다.`,
    );
    if (!confirmed) return;
    deleteNoticeMutation.mutate(noticeId);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = form.title.trim();
    const body = form.body.trim();

    if (!title || !body) {
      setFormError('제목과 본문을 입력해야 공지를 발행할 수 있습니다.');
      return;
    }

    setFormError('');
    createNoticeMutation.mutate();
  }

  const dashboard = dashboardQuery.data;
  const noticeError = noticesQuery.error
    ? formatApiError(noticesQuery.error, '공지 목록을 불러오지 못했습니다')
    : '';

  return (
    <PageLayout
      description="서비스 공지와 대회, 채점 인프라 상태를 한 곳에서 확인합니다."
      eyebrow="Service Master"
      title="관리자 콘솔"
      width="7xl"
    >
      <AdminTabs />

      {dashboardQuery.error ? (
        <div className="rounded border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
          {formatApiError(
            dashboardQuery.error,
            '관리자 대시보드를 불러오지 못했습니다',
          )}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          accent="violet"
          description="서비스에 등록된 전체 대회 수"
          icon={<DashboardIcon />}
          label="대회"
          value={<AnimatedNumber value={dashboard?.contest_count ?? 0} />}
        />
        <AdminMetricCard
          accent="amber"
          description="아직 처리되지 않은 채점 작업"
          icon={<JudgeIcon />}
          label="대기 채점"
          value={<AnimatedNumber value={dashboard?.pending_jobs ?? 0} />}
        />
        <AdminMetricCard
          accent="emerald"
          description="활성 노드 / 전체 노드"
          icon={<JudgeIcon />}
          label="채점 노드"
          value={`${dashboard?.active_judge_node_count ?? 0}/${dashboard?.judge_node_count ?? 0}`}
        />
        <AdminMetricCard
          accent="rose"
          description="전송을 기다리는 메일"
          icon={<NoticeIcon />}
          label="메일 큐"
          value={<AnimatedNumber value={dashboard?.mail_queue_pending ?? 0} />}
        />
      </div>

      <AdminPanel
        description="새 공지를 발행하면 공개 공지와 긴급 공지 영역에 반영됩니다."
        title="공지 발행"
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-black text-slate-700">
              제목
              <input
                className="h-11 rounded border border-slate-200 px-3 text-sm font-bold text-slate-950 transition outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="예: 채점 서버 점검 안내"
                value={form.title}
              />
            </label>
            <label className="grid gap-2 text-sm font-black text-slate-700">
              요약
              <input
                className="h-11 rounded border border-slate-200 px-3 text-sm font-bold text-slate-950 transition outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, summary: event.target.value }))
                }
                placeholder="목록에 짧게 표시될 설명"
                value={form.summary}
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-black text-slate-700">
            본문
            <textarea
              className="min-h-36 resize-y rounded border border-slate-200 px-3 py-3 text-sm leading-6 font-bold text-slate-950 transition outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              onChange={(event) =>
                setForm((prev) => ({ ...prev, body: event.target.value }))
              }
              placeholder="공지 상세 내용을 입력하세요."
              value={form.body}
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm font-black text-slate-700">
              <input
                checked={form.emergency}
                className="size-4 accent-violet-600"
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    emergency: event.target.checked,
                  }))
                }
                type="checkbox"
              />
              긴급 공지로 표시
            </label>
            <button
              className="h-11 rounded bg-violet-950 px-5 text-sm font-black text-white shadow-sm transition hover:bg-violet-800 disabled:bg-slate-300"
              disabled={createNoticeMutation.isPending}
              type="submit"
            >
              {createNoticeMutation.isPending ? '발행 중' : '공지 발행'}
            </button>
          </div>

          {formError || createNoticeMutation.error ? (
            <p className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {formError ||
                formatApiError(
                  createNoticeMutation.error,
                  '공지 발행에 실패했습니다',
                )}
            </p>
          ) : null}
        </form>
      </AdminPanel>

      <details className="group rounded border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-xl font-black text-slate-950 transition hover:bg-slate-50">
          서비스 공지
          <span className="text-sm font-black text-violet-700 group-open:hidden">
            펼치기
          </span>
          <span className="hidden text-sm font-black text-slate-500 group-open:inline">
            접기
          </span>
        </summary>
        <div className="grid gap-5 border-t border-slate-100 p-6">
          <p className="text-sm font-medium text-slate-500">
            최근 공지 목록을 확인합니다.
          </p>

          {noticeError ? (
            <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {noticeError}
            </div>
          ) : null}

          <div className="divide-y divide-slate-100 rounded border border-slate-200">
            {serviceNotices.length > 0 ? (
              pagedServiceNotices.map((notice) => (
                <article
                  className="grid gap-2 px-4 py-4"
                  key={notice.service_notice_id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() =>
                        setExpandedNoticeId((current) =>
                          current === notice.service_notice_id
                            ? ''
                            : notice.service_notice_id,
                        )
                      }
                      type="button"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {notice.emergency ? (
                          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-600">
                            긴급
                          </span>
                        ) : (
                          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
                            일반
                          </span>
                        )}
                        <strong className="text-base font-black break-keep text-slate-950">
                          {notice.title}
                        </strong>
                      </div>
                    </button>
                    <button
                      className="h-9 rounded border border-rose-200 bg-white px-3 text-xs font-black text-rose-600 transition hover:bg-rose-50 disabled:text-slate-300"
                      disabled={deleteNoticeMutation.isPending}
                      onClick={() =>
                        removeNotice(notice.service_notice_id, notice.title)
                      }
                      type="button"
                    >
                      삭제
                    </button>
                  </div>
                  <time
                    className="text-xs font-bold text-slate-400"
                    dateTime={notice.published_at}
                  >
                    {formatDateTime(notice.published_at)}
                  </time>
                  {expandedNoticeId === notice.service_notice_id ? (
                    <div className="grid gap-3 rounded border border-slate-200 bg-slate-50 px-4 py-3">
                      {notice.summary ? (
                        <p className="text-sm font-bold text-slate-600">
                          {notice.summary}
                        </p>
                      ) : null}
                      <p className="text-sm leading-7 whitespace-pre-wrap text-slate-700">
                        {notice.body}
                      </p>
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="px-4 py-8 text-center text-sm font-bold text-slate-500">
                등록된 서비스 공지가 없습니다.
              </p>
            )}
          </div>
          {serviceNotices.length > NOTICE_PAGE_SIZE ? (
            <Pagination
              currentPage={noticePage}
              onChange={(page) => {
                setNoticePage(page);
                setExpandedNoticeId('');
              }}
              totalPages={totalNoticePages}
            />
          ) : null}
          {deleteNoticeMutation.error ? (
            <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {formatApiError(
                deleteNoticeMutation.error,
                '서비스 공지 삭제에 실패했습니다',
              )}
            </div>
          ) : null}
        </div>
      </details>
    </PageLayout>
  );
}
