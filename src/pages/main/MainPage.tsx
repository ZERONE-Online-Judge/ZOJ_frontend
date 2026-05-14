import { useQuery } from '@tanstack/react-query';
import ContestListSection from '@/components/main/ContestListSection';
import HeroSection from '@/components/main/HeroSection';
import NoticeSection from '@/components/main/NoticeSection';
import { mainPageContent } from '@/data/testContent';
import { getPublicContests } from '@/domains/contestAdministration/api';
import { sortContestsByStartAt } from '@/domains/contestAdministration/logic';
import { toContestCardData } from '@/domains/contestAdministration/presentation';
import { getPublicServiceNotices } from '@/domains/serviceCommunication/api';
import { formatDateTime } from '@/shared/lib/dateTime';

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
  const noticeItems = noticesQuery.data?.slice(0, 5).map((notice) => ({
    label: notice.emergency ? '긴급' : '공지',
    title: notice.title,
    date: formatDateTime(notice.published_at),
    href: '/notices',
  })) ?? [];
  const contestItems = sortContestsByStartAt(contestsQuery.data ?? [])
    .slice(0, 6)
    .map(toContestCardData);

  return (
    <>
      <HeroSection {...hero} />
      <div className="mx-6 my-28 flex flex-col gap-28 lg:mx-36 xl:mx-52">
        <NoticeSection notices={noticeItems} title="공지사항" titleHref="/notices" />
        <ContestListSection contests={contestItems} title="대회 목록" titleHref="/contests" />
      </div>
    </>
  );
}
