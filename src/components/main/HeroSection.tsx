import type { HeroContent } from '@/data/testContent';

type HeroSectionProps = HeroContent;

export default function HeroSection({
  imageSrc,
  imageAlt,
  headline,
  description,
}: HeroSectionProps) {
  return (
    <section className="relative w-full overflow-hidden">
      <img alt={imageAlt} className="block h-auto w-full" src={imageSrc} />
      <div className="absolute inset-0 bg-black/35" />

      <div className="absolute inset-0 z-10 mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-6xl leading-tight font-semibold text-white">
          {headline}
        </h1>
        <p className="text-hero-copy mt-12 max-w-5xl text-xl leading-snug font-semibold break-keep sm:mt-16 sm:text-2xl lg:text-3xl">
          {description}
        </p>
      </div>
    </section>
  );
}
