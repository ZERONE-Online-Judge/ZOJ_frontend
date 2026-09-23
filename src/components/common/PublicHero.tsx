import type { ReactNode } from 'react';
import '@/pages/public/PublicExperience.css';
import './PublicHero.css';

type PublicHeroProps = {
  children: ReactNode;
  className?: string;
};

export default function PublicHero({
  children,
  className = '',
}: PublicHeroProps) {
  return (
    <section className={`experience-hero public-hero ${className}`}>
      <div className="public-hero-orbit is-one" aria-hidden="true" />
      <div className="public-hero-orbit is-two" aria-hidden="true" />
      <div className="experience-container">{children}</div>
    </section>
  );
}
