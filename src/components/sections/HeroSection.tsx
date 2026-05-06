import heroImage from '@/assets/images/hero image.png';

export default function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden">
      <img
        alt=""
        aria-hidden="true"
        className="block h-auto w-full"
        src={heroImage}
      />
      <div className="absolute inset-0 bg-black/35" />

      <div className="absolute inset-0 z-10 mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-6xl leading-tight font-semibold text-white">
          ZERONE ONLINE JUDGE
        </h1>
        <p className="text-hero-copy mt-16 max-w-5xl text-3xl leading-snug font-semibold">
          코딩 대회를 여는 스마트한 방법, 소규모 스터디부터 대회까지, 완벽한
          대회를 완성해보세요
        </p>
      </div>
    </section>
  );
}
