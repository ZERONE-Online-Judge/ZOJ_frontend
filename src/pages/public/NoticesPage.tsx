import { useQuery } from '@tanstack/react-query';
import PageLayout from '@/components/common/PageLayout';
import { getPublicServiceNotices } from '@/domains/serviceCommunication/api';
import { formatDateTime } from '@/shared/lib/dateTime';
import PageNotice from '@/shared/ui/PageNotice';

export default function NoticesPage() {
  const noticesQuery = useQuery({
    queryKey: ['public-service-notices'],
    queryFn: getPublicServiceNotices,
    refetchInterval: 15_000,
  });

  const notices = noticesQuery.data ?? [];

  return (
    <PageLayout
      description="서비스 운영 공지를 최신 상태로 표시합니다."
      eyebrow="Notice"
      title="공지사항"
    >
      {noticesQuery.isLoading && (
        <PageNotice message="공지사항을 불러오는 중입니다." status="loading" />
      )}
      {noticesQuery.isError && (
        <PageNotice message="공지사항을 불러오지 못했습니다." status="error" />
      )}

      <ul className="divide-y divide-slate-200 border-y border-slate-200">
        {notices.map((notice) => (
          <li
            className="grid gap-3 px-4 py-5 transition hover:bg-amber-50"
            key={notice.service_notice_id}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                {notice.emergency ? '긴급' : '공지'}
              </span>
              <h2 className="text-lg font-bold text-slate-950">
                {notice.title}
              </h2>
              <time className="ml-auto text-xs font-medium text-slate-500">
                {formatDateTime(notice.published_at)}
              </time>
            </div>
            {notice.summary && (
              <p className="text-sm leading-6 text-slate-600">
                {notice.summary}
              </p>
            )}
            {notice.body && (
              <p className="text-sm leading-6 whitespace-pre-wrap text-slate-700">
                {notice.body}
              </p>
            )}
          </li>
        ))}
      </ul>

      {!noticesQuery.isLoading && notices.length === 0 && (
        <PageNotice message="표시할 공지사항이 없습니다." status="idle" />
      )}
    </PageLayout>
  );
}
