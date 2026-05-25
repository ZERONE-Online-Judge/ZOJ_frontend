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
  const displayDescription = keepHeroCopyPhrasesTogether(typedDescription);

  return (
    <section className="relative w-full overflow-hidden">
      <img
        alt={imageAlt}
        className="animate-hero-image block h-auto w-full scale-[1.03]"
        src={imageSrc}
      />
      <div className="absolute inset-0 bg-black/35" />
      <div className="animate-hero-image-light absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.12)_34%,rgba(123,97,255,0.16)_48%,transparent_68%)]" />

      <div className="absolute inset-0 z-10 mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-6 text-center">
        <h1 className="animate-hero-title text-5xl leading-tight font-semibold text-white sm:text-6xl lg:text-7xl">
          {headline}
        </h1>
        <p
          aria-label={description}
          className="text-hero-copy animate-hero-copy mt-10 min-h-20 max-w-7xl text-xl leading-snug font-semibold break-keep sm:mt-14 sm:min-h-24 sm:text-2xl xl:text-[1.7rem]"
        >
          <span aria-hidden="true">{displayDescription}</span>
          <span
            aria-hidden="true"
            className={[
              'ml-1 inline-block h-[1em] w-0.5 translate-y-0.5 bg-white/85',
              isTyping
                ? 'animate-typing-caret'
                : 'animate-typing-caret opacity-60',
            ].join(' ')}
          />
        </p>
      </div>
    </section>
  );
}

function keepHeroCopyPhrasesTogether(text: string) {
  return text.replace(
    '완벽한 대회를 완성해보세요',
    '완벽한\u00a0대회를\u00a0완성해보세요',
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
