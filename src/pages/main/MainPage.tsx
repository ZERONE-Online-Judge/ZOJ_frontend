import ContestListSection from '@/components/main/ContestListSection';
import HeroSection from '@/components/main/HeroSection';
import NoticeSection from '@/components/main/NoticeSection';
import { mainPageContent } from '@/data/testContent';

export default function MainPage() {
  const { hero, notices, contests } = mainPageContent;

  return (
    <>
      <HeroSection {...hero} />
      <div className="mx-6 my-24 flex flex-col gap-24 lg:mx-64">
        <NoticeSection notices={notices.items} title={notices.title} />
        <ContestListSection contests={contests.items} title={contests.title} />
      </div>
    </>
  );
}
