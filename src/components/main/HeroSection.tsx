import { useEffect, useState } from 'react';
import type { HeroContent } from '@/data/testContent';

type HeroSectionProps = HeroContent;

export default function HeroSection({
  imageSrc,
  imageAlt,
  headline,
  description,
}: HeroSectionProps) {
  const typedDescription = useTypingText(description);
  const isTyping = typedDescription.length < description.length;

  return (
    <section className="relative w-full overflow-hidden">
      <img alt={imageAlt} className="block h-auto w-full" src={imageSrc} />
      <div className="absolute inset-0 bg-black/35" />

      <div className="absolute inset-0 z-10 mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-6 text-center">
        <h1 className="animate-hero-title text-5xl leading-tight font-semibold text-white sm:text-6xl lg:text-7xl">
          {headline}
        </h1>
        <p
          aria-label={description}
          className="text-hero-copy animate-hero-copy mt-10 min-h-20 max-w-5xl text-xl leading-snug font-semibold break-keep sm:mt-14 sm:min-h-24 sm:text-2xl lg:text-3xl"
        >
          <span aria-hidden="true">{typedDescription}</span>
          <span
            aria-hidden="true"
            className={[
              'ml-1 inline-block h-[1em] w-0.5 translate-y-0.5 bg-white/85',
              isTyping ? 'animate-typing-caret' : 'opacity-0',
            ].join(' ')}
          />
        </p>
      </div>
    </section>
  );
}

function useTypingText(text: string) {
  const [value, setValue] = useState(() =>
    prefersReducedMotion() ? text : '',
  );

  useEffect(() => {
    if (prefersReducedMotion()) return;

    let index = 0;
    let typingTimer: number | undefined;
    const startTimer = window.setTimeout(() => {
      typingTimer = window.setInterval(() => {
        index += 1;
        setValue(text.slice(0, index));
        if (index >= text.length) {
          window.clearInterval(typingTimer);
        }
      }, 42);
    }, 420);

    return () => {
      window.clearTimeout(startTimer);
      if (typingTimer) window.clearInterval(typingTimer);
    };
  }, [text]);

  return value;
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
