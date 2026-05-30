import { useQuery } from '@tanstack/react-query';
import ContestListSection from '@/components/main/ContestListSection';
import HeroSection from '@/components/main/HeroSection';
import NoticeSection from '@/components/main/NoticeSection';
import { mainPageContent } from '@/data/testContent';
import { mainPageText } from '@/data/uiText';
import { getPublicContests } from '@/domains/contestAdministration/api';
import { getPublicServiceNotices } from '@/domains/serviceCommunication/api';
import { formatDateTime } from '@/shared/lib/dateTime';
import PageNotice from '@/shared/ui/PageNotice';

export default function MainPage() {
  const { hero } = mainPageContent;
  const noticesQuery = useQuery({
    queryKey: ['public-service-notices'],
    queryFn: getPublicServiceNotices,
    refetchInterval: 15_000,
  });
  const contestsQuery = useQuery({
    queryKey: ['public-contests'],
    queryFn: getPublicContests,
    refetchInterval: 15_000,
  });
  const noticeItems =
    noticesQuery.data
      ? [...noticesQuery.data]
          .sort(
            (a, b) =>
              Number(b.emergency) - Number(a.emergency) ||
              new Date(b.published_at).getTime() -
                new Date(a.published_at).getTime(),
          )
          .slice(0, 5)
          .map((notice) => ({
            label: notice.emergency
              ? mainPageText.emergencyNoticeLabel
              : mainPageText.noticeLabel,
            title: notice.title,
            date: formatDateTime(notice.published_at),
            href: `/notices?noticeId=${encodeURIComponent(notice.service_notice_id)}`,
            tone: notice.emergency ? 'emergency' as const : 'default' as const,
          }))
      : [];
  const contestItems = contestsQuery.data ?? [];

  return (
    <>
      <HeroSection {...hero} />
      <div className="mx-auto my-12 flex w-full max-w-7xl flex-col gap-14 px-4 sm:my-16 sm:gap-18 sm:px-6 lg:my-24 lg:gap-24 lg:px-8">
        <NoticeSection
          isLoading={noticesQuery.isPending}
          notices={noticeItems}
          title={mainPageText.noticeSectionTitle}
          titleHref="/notices"
        >
          <div className="border-y border-slate-200">
            {noticesQuery.isPending ? (
              <PageNotice message="공지사항을 불러오는 중입니다." status="loading" />
            ) : null}
            {noticesQuery.isError ? (
              <PageNotice message="공지사항을 불러오지 못했습니다." status="error" />
            ) : null}
            {!noticesQuery.isPending &&
            !noticesQuery.isError &&
            noticeItems.length === 0 ? (
              <PageNotice message="표시할 공지사항이 없습니다." status="idle" />
            ) : null}
          </div>
        </NoticeSection>
        <ContestListSection
          contests={contestItems}
          title={mainPageText.contestSectionTitle}
          titleHref="/contests"
        />
      </div>
    </>
  );
}
