import type { ReactNode } from 'react';
import '@/pages/public/PublicExperience.css';
import './PublicHero.css';

type PublicHeroProps = {
  children: ReactNode;
  className?: string;
  scrollTo?: string;
};

export default function PublicHero({
  children,
  className = '',
  scrollTo,
}: PublicHeroProps) {
  return (
    <section className={`experience-hero public-hero ${className}`}>
      <div className="public-hero-orbit is-one" aria-hidden="true" />
      <div className="public-hero-orbit is-two" aria-hidden="true" />
      <div className="experience-container">
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
