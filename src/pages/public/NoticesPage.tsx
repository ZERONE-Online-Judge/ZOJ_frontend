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

  const orderedNotices = useMemo(
    () =>
      [...(noticesQuery.data ?? [])].sort(
        (a, b) =>
          Number(b.emergency) - Number(a.emergency) ||
          new Date(b.published_at).getTime() -
            new Date(a.published_at).getTime(),
      ),
    [noticesQuery.data],
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
      {noticesQuery.isPending && (
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

      {!noticesQuery.isPending && orderedNotices.length === 0 && (
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
    <ul className="grid gap-3">
      {notices.map((notice) => {
        const isExpanded = expandedNoticeId === notice.service_notice_id;

        return (
          <li
            className={[
              'overflow-hidden rounded border bg-white shadow-sm transition',
              isExpanded
                ? 'border-amber-200 shadow-md shadow-amber-100/60'
                : 'border-slate-200 hover:border-amber-200',
            ].join(' ')}
            key={notice.service_notice_id}
          >
            <button
              aria-expanded={isExpanded}
              className={[
                'grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-5 py-5 text-left transition',
                isExpanded
                  ? 'bg-amber-50'
                  : 'bg-white hover:bg-slate-50',
              ].join(' ')}
              onClick={() => onToggle(notice.service_notice_id)}
              type="button"
            >
              <span
                className={[
                  'rounded-full px-3 py-1 text-xs font-black',
                  notice.emergency
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-slate-950 text-white',
                ].join(' ')}
              >
                {notice.emergency
                  ? publicPageText.notices.emergencyLabel
                  : publicPageText.notices.label}
              </span>
              <span className="grid min-w-0 gap-1">
                <strong className="min-w-0 text-lg font-black break-keep text-slate-950 sm:truncate">
                  {notice.title}
                </strong>
                {notice.summary ? (
                  <span className="min-w-0 text-sm font-medium text-slate-500 sm:truncate">
                    {notice.summary}
                  </span>
                ) : null}
              </span>
              <time className="shrink-0 text-xs font-medium text-slate-500">
                {formatDateTime(notice.published_at)}
              </time>
            </button>
            {isExpanded ? (
              <article className="grid gap-4 border-t border-amber-100 bg-white px-5 py-5">
                {notice.summary ? (
                  <section className="grid gap-2 rounded border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-xs font-black text-slate-400">
                      요약
                    </span>
                    <p className="text-sm leading-6 font-bold break-keep text-slate-700">
                      {notice.summary}
                    </p>
                  </section>
                ) : null}
                {notice.body ? (
                  <section className="grid gap-2 rounded border border-slate-200 bg-white px-4 py-4">
                    <span className="text-xs font-black text-slate-400">
                      본문
                    </span>
                    <p className="text-sm leading-7 whitespace-pre-wrap text-slate-800">
                      {notice.body}
                    </p>
                  </section>
                ) : (
                  <section className="rounded border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-500">
                    등록된 본문이 없습니다.
                  </section>
                )}
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
