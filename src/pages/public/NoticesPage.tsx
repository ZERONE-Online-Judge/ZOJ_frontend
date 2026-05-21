import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageLayout from '@/components/common/PageLayout';
import { publicPageText } from '@/data/uiText';
import type { ServiceNotice } from '@/domains/serviceCommunication/types';
import { getPublicServiceNotices } from '@/domains/serviceCommunication/api';
import { formatDateTime } from '@/shared/lib/dateTime';
import PageNotice from '@/shared/ui/PageNotice';

const NOTICE_PAGE_SIZE = 20;

export default function NoticesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedNoticeId = searchParams.get('noticeId') ?? '';
  const [expandedNoticeId, setExpandedNoticeId] = useState(requestedNoticeId);
  const [page, setPage] = useState(1);
  const noticesQuery = useQuery({
    queryKey: ['public-service-notices'],
    queryFn: getPublicServiceNotices,
    refetchInterval: 15_000,
  });

  const notices = noticesQuery.data ?? [];
  const orderedNotices = useMemo(
    () =>
      [...notices].sort(
        (a, b) =>
          Number(b.emergency) - Number(a.emergency) ||
          new Date(b.published_at).getTime() -
            new Date(a.published_at).getTime(),
      ),
    [notices],
  );
  const targetNoticeIndex = requestedNoticeId
    ? orderedNotices.findIndex(
        (notice) => notice.service_notice_id === requestedNoticeId,
      )
    : -1;
  const currentPage =
    targetNoticeIndex >= 0
      ? Math.floor(targetNoticeIndex / NOTICE_PAGE_SIZE) + 1
      : page;
  const totalPages = Math.max(1, Math.ceil(orderedNotices.length / NOTICE_PAGE_SIZE));
  const pagedNotices = orderedNotices.slice(
    (currentPage - 1) * NOTICE_PAGE_SIZE,
    currentPage * NOTICE_PAGE_SIZE,
  );

  function toggleNotice(noticeId: string) {
    const nextNoticeId = expandedNoticeId === noticeId ? '' : noticeId;
    setExpandedNoticeId(nextNoticeId);
    setSearchParams(nextNoticeId ? { noticeId: nextNoticeId } : {});
  }

  function changePage(nextPage: number) {
    setPage(nextPage);
    setExpandedNoticeId('');
    setSearchParams({});
  }

  return (
    <PageLayout
      description={publicPageText.notices.description}
      eyebrow={publicPageText.notices.eyebrow}
      title={publicPageText.notices.title}
    >
      {noticesQuery.isLoading && (
        <PageNotice message={publicPageText.notices.loading} status="loading" />
      )}
      {noticesQuery.isError && (
        <PageNotice message={publicPageText.notices.loadError} status="error" />
      )}

      <ServiceNoticeList
        expandedNoticeId={expandedNoticeId}
        notices={pagedNotices}
        onToggle={toggleNotice}
      />

      {orderedNotices.length > NOTICE_PAGE_SIZE ? (
        <Pagination
          currentPage={currentPage}
          onChange={changePage}
          totalPages={totalPages}
        />
      ) : null}

      {!noticesQuery.isLoading && notices.length === 0 && (
        <PageNotice message={publicPageText.notices.empty} status="idle" />
      )}
    </PageLayout>
  );
}

function ServiceNoticeList({
  expandedNoticeId,
  notices,
  onToggle,
}: {
  expandedNoticeId: string;
  notices: ServiceNotice[];
  onToggle: (noticeId: string) => void;
}) {
  return (
    <ul className="divide-y divide-slate-200 border-y border-slate-200">
      {notices.map((notice) => {
        const isExpanded = expandedNoticeId === notice.service_notice_id;

        return (
          <li key={notice.service_notice_id}>
            <button
              aria-expanded={isExpanded}
              className={[
                'grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-5 px-4 py-5 text-left transition hover:bg-amber-50',
                isExpanded ? 'bg-amber-50' : '',
              ].join(' ')}
              onClick={() => onToggle(notice.service_notice_id)}
              type="button"
            >
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                {notice.emergency
                  ? publicPageText.notices.emergencyLabel
                  : publicPageText.notices.label}
              </span>
              <strong className="min-w-0 text-lg font-bold break-keep text-slate-950 sm:truncate">
                {notice.title}
              </strong>
              <time className="shrink-0 text-xs font-medium text-slate-500">
                {formatDateTime(notice.published_at)}
              </time>
            </button>
            {isExpanded ? (
              <article className="grid gap-3 bg-white px-4 pb-6">
                {notice.summary ? (
                  <p className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                    {notice.summary}
                  </p>
                ) : null}
                {notice.body ? (
                  <p className="text-sm leading-7 whitespace-pre-wrap text-slate-800">
                    {notice.body}
                  </p>
                ) : null}
              </article>
            ) : null}
          </li>
        );
      })}
    </ul>
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
    <nav className="mt-6 flex flex-wrap items-center justify-center gap-2">
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
