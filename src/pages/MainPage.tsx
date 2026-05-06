import HeroSection from '@/components/sections/HeroSection';

export default function MainPage() {
  return (
    <>
      <HeroSection />
      <section aria-label="스크롤 테스트 영역">
        <div className="h-80 bg-gradient-to-b from-red-500 to-orange-400" />
        <div className="h-80 bg-gradient-to-b from-orange-400 to-yellow-300" />
        <div className="h-80 bg-gradient-to-b from-yellow-300 to-green-400" />
        <div className="h-80 bg-gradient-to-b from-green-400 to-sky-400" />
        <div className="h-80 bg-gradient-to-b from-sky-400 to-blue-500" />
        <div className="h-80 bg-gradient-to-b from-blue-500 to-purple-600" />
      </section>
    </>
  );
}
