import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import PublicHero from '@/components/common/PublicHero';
import {
  ExperienceArrow,
  ExperienceReveal,
} from '@/components/common/PublicExperience';
import ContestListItem from '@/components/ui/ContestListItem';
import { getPublicContests } from '@/domains/contestAdministration/api';
import { contestAccessPhase } from '@/domains/contestAdministration/logic';
import { toContestCardData } from '@/domains/contestAdministration/presentation';
import { getPublicServiceNotices } from '@/domains/serviceCommunication/api';
import usePublicMotion from '@/shared/hooks/usePublicMotion';
import useDocumentVisibility from '@/shared/hooks/useDocumentVisibility';
import '@/pages/public/ContestsPage.css';
import './MainPage.css';

const shortcuts = [
  {
    number: '01',
    title: 'ZOJ가 궁금하다면',
    description: '대회 현장에서 시작된 우리의 이야기.',
    to: '/about',
    label: 'ZOJ 소개',
    symbol: '✳',
  },
  {
    number: '02',
    title: '첫 참가를 준비한다면',
    description: '로그인부터 제출까지, 차근차근 함께해요.',
    to: '/support',
    label: '참가 방법',
    symbol: '↗',
  },
  {
    number: '03',
    title: '내 코드가 기다려진다면',
    description: '지금 채점 서버의 상태를 확인해 보세요.',
    to: '/judge-status',
    label: '채점 상태',
    symbol: '</>',
  },
];

export default function MainPage() {
  const motion = usePublicMotion();
  const visible = useDocumentVisibility();
  const noticesQuery = useQuery({
    queryKey: ['public-service-notices'],
    queryFn: getPublicServiceNotices,
    refetchInterval: visible ? 15_000 : false,
    refetchIntervalInBackground: false,
  });
  const contestsQuery = useQuery({
    queryKey: ['public-contests'],
    queryFn: getPublicContests,
    refetchInterval: visible ? 15_000 : false,
    refetchIntervalInBackground: false,
  });
  const notices = [...(noticesQuery.data ?? [])]
    .sort(
      (a, b) =>
        Number(b.emergency) - Number(a.emergency) ||
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
    )
    .slice(0, 5);
  const phaseOrder = { running: 0, before: 1, schedule_tbd: 2, ended: 3 };
  const contests = [...(contestsQuery.data ?? [])]
    .sort((a, b) => {
      const aPhase = contestAccessPhase(a),
        bPhase = contestAccessPhase(b);
      return (
        phaseOrder[aPhase] - phaseOrder[bPhase] ||
        (aPhase === 'before'
          ? new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
          : new Date(b.start_at).getTime() - new Date(a.start_at).getTime())
      );
    })
    .slice(0, 4);
  return (
    <div
      className="public-experience contest-directory home-experience"
      data-motion={motion.paused ? 'off' : 'on'}
    >
      <PublicHero
        label="Zerone Online Judge"
        motion={motion}
        className="home-hero"
        scrollTo="#home-explore"
      >
        <div className="experience-hero-grid">
          <div className="experience-hero-copy">
            <p className="experience-eyebrow">
              FROM ZERO TO YOUR NEXT CHALLENGE
            </p>
            <h1>
              생각을 코드로,
              <br />
              도전을 정답으로<span className="experience-lime">.</span>
            </h1>
            <p className="experience-lead">
              문제를 만나는 설렘부터 정답의 기쁨까지.
              <br />
              당신의 다음 도전, ZOJ에서 시작하세요.
            </p>
            <div className="experience-actions">
              <Link to="/contests" className="experience-button is-lime">
                대회 둘러보기 <ExperienceArrow />
              </Link>
              <Link to="/about" className="experience-text-link">
                ZOJ 알아보기 <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <p className="home-hero-caption">
              <span /> 준비하는 사람도, 도전하는 사람도. 함께하는 대회 플랫폼.
            </p>
          </div>
          <div className="home-visual" aria-hidden="true">
            <div className="home-code-window">
              <div className="home-window-bar">
                <span>
                  <i />
                  <i />
                  <i />
                </span>
                <span>YOUR NEXT CHALLENGE</span>
                <small>예시 화면</small>
              </div>
              <div className="home-code-heading">
                <span>A</span>
                <div>
                  <small>오늘의 첫 번째 도전</small>
                  <strong>두 수의 합</strong>
                </div>
                <span>↗</span>
              </div>
              <div className="home-code-lines">
                <div>
                  <em>01</em>
                  <code>
                    <b>int</b> main() {'{'}
                  </code>
                </div>
                <div>
                  <em>02</em>
                  <code>
                    {' '}
                    <b>int</b> a, b;
                  </code>
                </div>
                <div>
                  <em>03</em>
                  <code> cin &gt;&gt; a &gt;&gt; b;</code>
                </div>
                <div>
                  <em>04</em>
                  <code> cout &lt;&lt; a + b;</code>
                </div>
                <div>
                  <em>05</em>
                  <code>
                    {' '}
                    <b>return</b> <strong>0</strong>;
                  </code>
                </div>
                <div>
                  <em>06</em>
                  <code>
                    {'}'}
                    <i />
                  </code>
                </div>
              </div>
              <div className="home-test-cells">
                {[1, 2, 3, 4].map((n) => (
                  <span key={n}>
                    <i>✓</i> TEST 0{n}
                  </span>
                ))}
              </div>
            </div>
            <div className="home-accepted">
              <span>✓</span>
              <div>
                <small>한 걸음 더 나아갔어요.</small>
                <strong>맞았습니다!</strong>
              </div>
              <i>✳</i>
            </div>
            <div className="home-visual-caption">
              <span>WRITE.</span>
              <span>SUBMIT.</span>
              <span>GROW.</span>
            </div>
          </div>
        </div>
      </PublicHero>
      <section
        className="experience-container home-explore"
        id="home-explore"
        aria-label="ZOJ 둘러보기"
      >
        <ExperienceReveal className="home-shortcuts">
          {shortcuts.map((item) => (
            <Link key={item.to} to={item.to}>
              <div>
                <span>
                  {item.number} / {item.label}
                </span>
                <i aria-hidden="true">{item.symbol}</i>
              </div>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <span className="home-shortcut-arrow">
                <ExperienceArrow />
              </span>
            </Link>
          ))}
        </ExperienceReveal>
      </section>
      <section className="experience-container experience-section home-contests">
        <div className="experience-section-heading">
          <div>
            <p className="experience-eyebrow">FIND YOUR NEXT CHALLENGE</p>
            <h2>지금 만나는 대회</h2>
          </div>
          <Link className="experience-text-link" to="/contests">
            전체 대회 보기 <ExperienceArrow />
          </Link>
        </div>
        {contestsQuery.isPending ? (
          <p className="home-feed-message" role="status">
            대회 일정을 불러오고 있어요.
          </p>
        ) : null}
        {contestsQuery.isError ? (
          <div className="home-feed-message is-error" role="alert">
            <p>대회 정보를 불러오지 못했어요.</p>
            <button
              type="button"
              disabled={contestsQuery.isFetching}
              onClick={() => void contestsQuery.refetch()}
            >
              다시 확인하기 ↻
            </button>
          </div>
        ) : null}
        {contests.length ? (
          <ul className="home-contest-list">
            {contests.map((contest) => {
              const phase = contestAccessPhase(contest);
              return (
                <ContestListItem
                  key={contest.contest_id}
                  {...toContestCardData(contest)}
                  directoryMeta={{
                    phase:
                      phase === 'running'
                        ? 'running'
                        : phase === 'ended'
                          ? 'ended'
                          : 'upcoming',
                    startAt: contest.start_at,
                    endAt: contest.end_at,
                    scheduleTbd: phase === 'schedule_tbd',
                  }}
                />
              );
            })}
          </ul>
        ) : !contestsQuery.isPending && !contestsQuery.isError ? (
          <div className="home-feed-message">
            <span aria-hidden="true">✳</span>
            <h3>새로운 도전을 준비하고 있어요.</h3>
            <p>대회가 공개되면 이곳에서 가장 먼저 만나보세요.</p>
          </div>
        ) : null}
      </section>
      <section className="experience-soft-section">
        <div className="experience-container experience-section home-news">
          <div>
            <p className="experience-eyebrow">WHAT’S NEW</p>
            <h2>
              ZOJ의
              <br />
              새로운 이야기<span>.</span>
            </h2>
            <p>
              참가 전에 알아두면 좋은 소식과
              <br />
              서비스의 변화를 전해 드려요.
            </p>
            <Link to="/notices" className="experience-text-link">
              공지사항 모두 보기 <ExperienceArrow />
            </Link>
          </div>
          <div>
            {noticesQuery.isPending ? (
              <p className="home-feed-message" role="status">
                새로운 소식을 불러오고 있어요.
              </p>
            ) : null}
            {noticesQuery.isError ? (
              <div className="home-feed-message is-error" role="alert">
                <p>공지사항을 불러오지 못했어요.</p>
                <button
                  type="button"
                  disabled={noticesQuery.isFetching}
                  onClick={() => void noticesQuery.refetch()}
                >
                  다시 확인하기 ↻
                </button>
              </div>
            ) : null}
            {notices.length ? (
              <ul className="home-notice-list">
                {notices.map((notice) => (
                  <li key={notice.service_notice_id}>
                    <Link
                      to={`/notices?noticeId=${encodeURIComponent(notice.service_notice_id)}`}
                    >
                      <div>
                        <span
                          className={notice.emergency ? 'is-emergency' : ''}
                        >
                          {notice.emergency ? '중요 안내' : 'ZOJ 소식'}
                        </span>
                        <time dateTime={notice.published_at}>
                          {new Intl.DateTimeFormat('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          }).format(new Date(notice.published_at))}
                        </time>
                      </div>
                      <h3>{notice.title}</h3>
                      <ExperienceArrow />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : !noticesQuery.isPending && !noticesQuery.isError ? (
              <div className="home-feed-message">
                <h3>새로운 소식을 준비하고 있어요.</h3>
                <p>궁금한 점은 지원 안내에서 먼저 확인해 보세요.</p>
                <Link to="/support" className="experience-text-link">
                  지원 안내 <ExperienceArrow />
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
