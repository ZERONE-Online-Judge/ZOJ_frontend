import ContestListSection from '@/components/sections/ContestListSection';
import HeroSection from '@/components/sections/HeroSection';
import NoticeSection from '@/components/sections/NoticeSection';

export default function MainPage() {
  return (
    <>
      <HeroSection />
      <div className="mx-6 my-24 flex flex-col gap-24 lg:mx-64">
        <NoticeSection />
        <ContestListSection />
      </div>
    </>
  );
}
