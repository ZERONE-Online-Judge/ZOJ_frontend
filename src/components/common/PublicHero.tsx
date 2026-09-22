import type { ReactNode } from 'react';
import type usePublicMotion from '@/shared/hooks/usePublicMotion';
import '@/pages/public/PublicExperience.css';
import './PublicHero.css';

type PublicHeroProps = {
  label: string;
  motion: ReturnType<typeof usePublicMotion>;
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
  scrollTo?: string;
};

export default function PublicHero({
  label,
  motion,
  children,
  aside,
  className = '',
  scrollTo,
}: PublicHeroProps) {
  return (
    <section className={`experience-hero public-hero ${className}`}>
      <div className="public-hero-orbit is-one" aria-hidden="true" />
      <div className="public-hero-orbit is-two" aria-hidden="true" />
      <div className="experience-container">
        <div className="experience-topline">
          <span>ZOJ / {label}</span>
          <div className="public-hero-tools">
            {aside}
            <button
              type="button"
              onClick={motion.toggle}
              disabled={motion.reduced}
              aria-pressed={motion.paused}
              className="public-motion-toggle"
            >
              <span aria-hidden="true">{motion.paused ? '▷' : 'Ⅱ'}</span>
              {motion.reduced
                ? '동작 줄이기 사용 중'
                : motion.paused
                  ? '애니메이션 켜기'
                  : '애니메이션 끄기'}
            </button>
          </div>
        </div>
        {children}
        {scrollTo ? (
          <div className="experience-hero-foot">
            <span>BUILD. COMPETE. CELEBRATE.</span>
            <a href={scrollTo}>
              SCROLL TO EXPLORE <span aria-hidden="true">↓</span>
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
