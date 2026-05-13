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
        <p className="text-hero-copy mt-16 max-w-5xl text-3xl leading-snug font-semibold">
          {description}
        </p>
      </div>
    </section>
  );
}
