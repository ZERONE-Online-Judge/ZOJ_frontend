import { Link } from 'react-router-dom';
import { ExperienceArrow } from '@/components/common/PublicExperience';
import type usePublicMotion from '@/shared/hooks/usePublicMotion';
import '@/pages/public/PublicExperience.css';
import './HomeHero.css';

export default function HomeHero({
  motion,
}: {
  motion: ReturnType<typeof usePublicMotion>;
}) {
  return (
    <section className="home-launch" aria-labelledby="home-launch-title">
      <div className="home-launch-aurora" aria-hidden="true" />
      <div className="experience-container">
        <div className="home-launch-topline">
          <span>
            <i aria-hidden="true" /> A NEW CHALLENGE STARTS HERE
          </span>
          <button
            type="button"
            className="home-motion-toggle"
            onClick={motion.toggle}
            disabled={motion.reduced}
            aria-pressed={motion.paused}
          >
            <span aria-hidden="true">{motion.paused ? '▷' : 'Ⅱ'}</span>
            {motion.reduced
              ? '동작 줄이기 사용 중'
              : motion.paused
                ? '애니메이션 켜기'
                : '애니메이션 끄기'}
          </button>
        </div>
        <div className="home-launch-heading">
          <p>상상이 코드가 되고, 코드가 가능성이 되는 곳</p>
          <h1 id="home-launch-title">
            당신의 다음 정답은,
            <br />
            <span>여기서 시작됩니다.</span>
          </h1>
        </div>
        <div className="home-universe" aria-hidden="true">
          <div className="home-universe-halo" />
          <div className="home-orbit home-orbit-one">
            <i />
          </div>
          <div className="home-orbit home-orbit-two">
            <i />
          </div>
          <div className="home-monogram">
            Z<span>O</span>J<span className="home-monogram-dot">.</span>
          </div>
          <div className="home-satellite is-code">
            <span>&lt;/&gt;</span>
            <div>
              <small>YOUR IDEA</small>
              <strong>Hello, possibility.</strong>
            </div>
          </div>
          <div className="home-satellite is-result">
            <span>✓</span>
            <div>
              <small>YOUR NEXT STEP</small>
              <strong>한 번 더, 한 걸음 더.</strong>
            </div>
          </div>
          <span className="home-star is-first">✳</span>
          <span className="home-star is-second">✦</span>
          <span className="home-universe-coordinate">
            FROM ZERO
            <br />
            TO YOUR NEXT CHALLENGE
          </span>
        </div>
        <div className="home-launch-bottom">
          <p>
            문제를 만나는 설렘부터 정답의 기쁨까지.
            <br />
            당신의 도전을 ZOJ와 함께하세요.
          </p>
          <div className="home-launch-actions">
            <Link to="/contests" className="home-start-button">
              대회 둘러보기 <ExperienceArrow />
            </Link>
            <Link to="/about" className="home-about-link">
              ZOJ 알아보기 <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
        <a className="home-launch-scroll" href="#home-explore">
          새로운 가능성을 만나보세요 <span aria-hidden="true">↓</span>
        </a>
      </div>
    </section>
  );
}
