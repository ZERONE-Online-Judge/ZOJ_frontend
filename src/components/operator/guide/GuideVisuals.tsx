import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type { GuideScene } from '@/data/operatorGuideContent';
import { guideAccessOutcome } from './guideDemoLogic';
import JudgeServerDemo from './JudgeServerDemo';

export function GuideIcon({
  kind = 'book',
  className = '',
}: {
  kind?: string;
  className?: string;
}) {
  const paths: Record<string, ReactNode> = {
    book: (
      <>
        <path d="M12 6c-3-2-7-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-2-1-6-1-9 1Z" />
        <path d="M12 6v14M6 9l3 1M15 10l3-1" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="3" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    people: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 4v2" />
      </>
    ),
    code: (
      <>
        <path d="m7 7-5 5 5 5m10-10 5 5-5 5m-4-13-2 20" />
      </>
    ),
    flag: (
      <>
        <path d="M5 22V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0" />
      </>
    ),
    spark: (
      <>
        <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7ZM20 2v4m-2-2h4" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6m0-10v.1" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      className={`og-icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[kind] ?? paths.book}
    </svg>
  );
}

export function GuideOverviewArt() {
  return (
    <div className="og-overview-art" aria-hidden="true">
      <svg className="og-orbit" viewBox="0 0 420 240">
        <path d="M50 170C90 15 335 20 373 140S125 265 50 170Z" />
        <path d="M90 197C14 87 302 4 360 101" />
      </svg>
      <div className="og-art-window">
        <div className="og-window-top">
          <i />
          <i />
          <i />
          <span>나의 대회 운영</span>
        </div>
        <div className="og-art-content">
          <span className="og-eyebrow">READY FOR YOUR CONTEST</span>
          <strong>준비부터 발표까지.</strong>
          <div className="og-art-bars">
            <i />
            <i />
            <i />
          </div>
          <div className="og-art-route">
            준비 <span>→</span> 진행 <span>→</span> 발표
          </div>
        </div>
      </div>
      <div className="og-art-badge og-art-check">
        <GuideIcon kind="check" />
        <span>설정 확인 완료</span>
      </div>
      <div className="og-art-badge og-art-score">
        <span className="og-art-medal">01</span>
        <span>
          순위 공개<small>한 단계씩, 차근차근</small>
        </span>
      </div>
      <span className="og-art-star">✳</span>
    </div>
  );
}

function useTimeline(count: number, motion: boolean) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!playing || !motion || !visible) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'hidden')
        setStep((value) => (value + 1) % count);
    }, 2800);
    return () => window.clearInterval(timer);
  }, [count, motion, playing, visible]);
  function jump(value: number) {
    setPlaying(false);
    setStep(value);
  }
  return {
    step,
    playing: playing && motion,
    ref,
    jump,
    toggle: () => setPlaying((value) => !value),
  };
}

function TimelineDemo({
  title,
  labels,
  motion,
  children,
  caption,
}: {
  title: string;
  labels: string[];
  motion: boolean;
  children: (step: number) => ReactNode;
  caption?: (step: number) => string;
}) {
  const { step, playing, ref, jump, toggle } = useTimeline(
    labels.length,
    motion,
  );
  return (
    <div className="og-timeline-demo" ref={ref}>
      <div className="og-demo-top">
        <div>
          <span className="og-eyebrow">움직임으로 이해하기</span>
          <h3>{title}</h3>
        </div>
        <span className="og-example-label">예시 화면</span>
      </div>
      <div className="og-scene">{children(step)}</div>
      <div className="og-frame-caption" aria-live={playing ? 'off' : 'polite'}>
        <span>{String(step + 1).padStart(2, '0')}</span>
        <p>{caption?.(step) ?? labels[step]}</p>
      </div>
      <div className="og-player">
        <button
          type="button"
          aria-label={playing ? '애니메이션 일시정지' : '애니메이션 재생'}
          disabled={!motion}
          onClick={toggle}
        >
          {playing ? 'Ⅱ 일시정지' : '▶ 재생'}
        </button>
        <div className="og-player-steps" aria-label="예시 단계">
          {labels.map((label, index) => (
            <button
              key={label}
              type="button"
              aria-label={`${index + 1}단계: ${label}`}
              aria-pressed={index === step}
              onClick={() => jump(index)}
            >
              <span />
              {index + 1}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => jump((step + 1) % labels.length)}>
          다음 <GuideIcon kind="arrow" />
        </button>
      </div>
      <p className="og-demo-note">
        단계 번호를 눌러 천천히 볼 수 있습니다. 실제 대회에는 적용되지 않습니다.
      </p>
    </div>
  );
}

function Flow({
  labels,
  step,
  icons,
}: {
  labels: string[];
  step: number;
  icons?: string[];
}) {
  return (
    <div className="og-flow">
      {labels.map((label, index) => (
        <div
          key={label}
          className={`og-flow-node ${index <= step ? 'is-reached' : ''} ${index === step ? 'is-current' : ''}`}
        >
          <span className="og-flow-icon">
            <GuideIcon
              kind={index < step ? 'check' : (icons?.[index] ?? 'book')}
            />
          </span>
          <small>0{index + 1}</small>
          <strong>{label}</strong>
          {index < labels.length - 1 && <span className="og-flow-connector" />}
        </div>
      ))}
    </div>
  );
}

function VisibilityDemo() {
  const [isPublic, setPublic] = useState(true);
  const [resource, setResource] = useState('participants');
  const [mock, setMock] = useState(false);
  const allowed = resource !== 'private';
  return (
    <div className="og-timeline-demo">
      <div className="og-demo-top">
        <div>
          <span className="og-eyebrow">설정을 바꿔 보세요</span>
          <h3>종료 후, 누가 문제집을 볼 수 있을까요?</h3>
        </div>
        <GuideIcon kind="lock" />
      </div>
      <div className="og-visibility-controls">
        <label>
          종료 후 대회 공개
          <select
            aria-label="종료 후 대회 공개"
            value={isPublic ? 'public' : 'private'}
            onChange={(e) => {
              const value = e.target.value === 'public';
              setPublic(value);
              if (!value && resource === 'public') setResource('participants');
            }}
          >
            <option value="public">공개</option>
            <option value="private">비공개</option>
          </select>
        </label>
        <label>
          문제집 공개 범위
          <select
            aria-label="문제집 공개 범위"
            value={resource}
            onChange={(e) => {
              setResource(e.target.value);
              if (e.target.value === 'private') setMock(false);
            }}
          >
            <option value="private">비공개</option>
            <option value="participants">참가자 공개 유지</option>
            {isPublic && <option value="public">비로그인 공개</option>}
          </select>
        </label>
      </div>
      <div className="og-audiences">
        {[
          ['guest', '비로그인 방문자', 'people'],
          ['participant', '등록된 참가자', 'code'],
          ['operator', '권한 있는 운영자', 'flag'],
        ].map(([id, label, icon]) => {
          const access = guideAccessOutcome(isPublic, resource, id);
          return (
            <div
              key={id}
              className={`og-audience ${access ? 'is-allowed' : ''}`}
            >
              <div className="og-person">
                <GuideIcon kind={icon} />
              </div>
              <strong>{label}</strong>
              <span className="og-access-line" />
              <span className="og-access-status">
                <GuideIcon kind={access ? 'check' : 'lock'} />
                {access ? '열람 가능' : '열람 제한'}
              </span>
            </div>
          );
        })}
      </div>
      <label className="og-check-option">
        <input
          type="checkbox"
          checked={mock}
          disabled={!allowed}
          onChange={(e) => setMock(e.target.checked)}
        />
        <span>
          모의채점 허용
          <small>
            {allowed
              ? '연습 제출을 제공하며 대회 순위에는 반영하지 않습니다.'
              : '문제집을 공개해야 켤 수 있습니다. 해설도 비공개가 됩니다.'}
          </small>
        </span>
      </label>
      <p className="og-state-explanation" role="status">
        {!isPublic
          ? '대회가 비공개이면 자료의 비로그인 공개를 선택할 수 없습니다.'
          : resource === 'public'
            ? '방문자도 문제를 읽을 수 있습니다. 제출·글쓰기에는 별도 로그인 조건이 적용됩니다.'
            : resource === 'private'
              ? '문제집을 닫으면 해설 공개와 모의채점도 제한됩니다.'
              : '등록된 참가자에게 문제집을 유지하고, 비로그인 방문자에게는 닫습니다.'}
      </p>
      <p className="og-demo-note">
        종료 후 문제집 정책을 단순화한 체험입니다. 실제 대회 설정은 변경되지
        않습니다.
      </p>
    </div>
  );
}

function RolesDemo() {
  const [role, setRole] = useState('participants');
  const roles = [
    {
      id: 'participants',
      title: '참가자 관리',
      allow: ['참가 유형', '참가팀', '강제 로그아웃', '접속 로그'],
    },
    { id: 'reviewer', title: '검수진', allow: ['문제 모아보기', '검수 제출'] },
    { id: 'viewer', title: '스코어보드 확인', allow: ['순위 조회'] },
    {
      id: 'manager',
      title: '스코어보드 관리',
      allow: ['순위 조회', '프리즈 조작', '순위 발표'],
    },
  ];
  const selected = roles.find((item) => item.id === role)!;
  const features = [
    '참가 유형',
    '참가팀',
    '강제 로그아웃',
    '접속 로그',
    '문제 모아보기',
    '검수 제출',
    '순위 조회',
    '프리즈 조작',
    '순위 발표',
  ];
  return (
    <div className="og-timeline-demo">
      <div className="og-demo-top">
        <div>
          <span className="og-eyebrow">역할 비교하기</span>
          <h3>역할에 따라 열리는 기능이 달라집니다</h3>
        </div>
        <GuideIcon kind="people" />
      </div>
      <div className="og-choice-row">
        {roles.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={role === item.id}
            onClick={() => setRole(item.id)}
          >
            {item.title}
          </button>
        ))}
      </div>
      <div className="og-role-map">
        {features.map((feature) => (
          <div
            key={feature}
            className={selected.allow.includes(feature) ? 'is-granted' : ''}
          >
            <GuideIcon
              kind={selected.allow.includes(feature) ? 'check' : 'lock'}
            />
            {feature}
          </div>
        ))}
      </div>
      <p className="og-state-explanation" role="status">
        {selected.title} 역할은 위에서 강조된 기능을 사용할 수 있습니다. 확인
        권한과 관리 권한을 구분하세요.
      </p>
      <p className="og-demo-note">
        대표 기능을 비교한 예시입니다. 실제 권한은 운영자 관리에서 저장해야
        바뀝니다.
      </p>
    </div>
  );
}

const teamNames = ['라임', '코발트', '오로라'];
function RankBoard({
  rows,
  hidden,
  frozen,
  title,
}: {
  rows: number[];
  hidden?: number[];
  frozen?: boolean;
  title: string;
}) {
  return (
    <div className="og-rank-board">
      <div className="og-rank-heading">
        <strong>{title}</strong>
        <span>{frozen ? '❄ 프리즈' : '공개 결과'}</span>
      </div>
      <div className="og-rank-rows">
        {teamNames.map((name, id) => {
          const rank = rows.indexOf(id);
          const concealed = hidden?.includes(id);
          return (
            <div
              className={`og-rank-row og-team-${id} ${concealed ? 'is-concealed' : ''}`}
              key={name}
              style={{ transform: `translateY(${rank * 52}px)` }}
            >
              <span className="og-rank-place">{rank + 1}</span>
              <strong>
                {concealed ? '아직 공개되지 않은 팀' : `${name} 팀`}
              </strong>
              <span>
                {concealed
                  ? '—'
                  : id === 2 && rank === 0
                    ? '5문제'
                    : `${4 - id}문제`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScoreboardDemo({ motion }: { motion: boolean }) {
  const [mode, setMode] = useState('freeze');
  const modes = [
    {
      id: 'freeze',
      label: '프리즈',
      steps: [
        '프리즈 전',
        '공개 표 고정',
        '내부 결과 갱신',
        '내부 순위 이동',
        '공개 표는 유지',
      ],
    },
    {
      id: 'manual',
      label: '순위별 공개',
      steps: [
        '프리즈 표 유지',
        '공개 시작 · 팀 가림',
        '3위 공개',
        '2위 공개',
        '1위 공개',
      ],
    },
    {
      id: 'resolver',
      label: '리졸버',
      steps: [
        '프리즈 표 유지',
        '발표 시작',
        '하위 팀 결과 공개',
        '추가 정답 반영',
        '순위 이동',
      ],
    },
    {
      id: 'immediate',
      label: '종료 즉시',
      steps: [
        '종료 전 프리즈',
        '종료 시각 도달',
        '전체 공개',
        '남은 채점 완료',
        '최신 순위 반영',
      ],
    },
  ];
  const selected = modes.find((item) => item.id === mode)!;
  return (
    <div>
      <div className="og-choice-row og-score-choices">
        {modes.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={mode === item.id}
            onClick={() => setMode(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <TimelineDemo
        key={mode}
        motion={motion}
        title="같은 결과, 다른 공개 방식"
        labels={selected.steps}
        caption={(step) =>
          mode === 'freeze' && step >= 2
            ? '운영자 내부에서는 결과가 갱신됩니다. 참가자에게는 프리즈 기준 표가 유지됩니다.'
            : selected.steps[step]
        }
      >
        {(step) => (
          <div className="og-board-compare">
            <RankBoard
              title="운영자 내부"
              rows={
                mode === 'manual' || mode === 'resolver' || step >= 3
                  ? [2, 0, 1]
                  : [0, 1, 2]
              }
            />
            <RankBoard
              title="참가자 공개"
              frozen={mode === 'freeze' || step === 0}
              rows={
                (mode === 'manual' && step > 0) ||
                (mode !== 'freeze' && step >= (mode === 'resolver' ? 4 : 3))
                  ? [2, 0, 1]
                  : [0, 1, 2]
              }
              hidden={
                mode === 'manual' && step > 0
                  ? step === 1
                    ? [0, 1, 2]
                    : step === 2
                      ? [0, 2]
                      : step === 3
                        ? [2]
                        : []
                  : []
              }
            />
          </div>
        )}
      </TimelineDemo>
      <p className="og-demo-note">
        동작 원리를 설명하는 3팀 예시입니다. 실제 리졸버는 미공개 제출 결과와
        확정 조건에 따라 진행합니다.
      </p>
    </div>
  );
}

function SessionDemo({ motion }: { motion: boolean }) {
  return (
    <TimelineDemo
      motion={motion}
      title="한 계정의 모든 기기에 전달되는 로그아웃"
      labels={[
        '여러 기기에서 로그인',
        '운영자가 로그아웃 실행',
        '해당 계정 세션 폐기',
        '연결된 화면에 종료 안내',
      ]}
      caption={(step) =>
        [
          '같은 계정으로 접속한 노트북·휴대전화·다른 대회 화면을 가정합니다.',
          '참가팀 목록에서 정확한 이메일을 확인하고 로그아웃을 실행합니다.',
          '선택한 계정의 기존 로그인 세션을 폐기합니다. 다른 기기도 영향을 받습니다.',
          '연결된 화면에 종료 안내가 뜹니다. 다시 로그인하는 것까지 막는 기능은 아닙니다.',
        ][step]
      }
    >
      {(step) => (
        <div className="og-session-scene">
          <div className="og-session-hub">
            <GuideIcon kind={step >= 2 ? 'lock' : 'people'} />
            <strong>member@example.com</strong>
            <span>{step < 2 ? '계정 연결됨' : '기존 세션 종료'}</span>
          </div>
          <div className="og-devices">
            {['노트북', '휴대전화', '다른 대회 화면'].map((device, index) => (
              <div
                className={`og-device ${step >= 2 ? 'is-disconnected' : ''}`}
                key={device}
                style={
                  { '--device-delay': `${index * 100}ms` } as CSSProperties
                }
              >
                <div className="og-device-screen">
                  <span className="og-device-dot" />
                  <i />
                  <i />
                  {step === 3 && (
                    <div className="og-mini-modal">
                      <GuideIcon kind="lock" />
                      <strong>로그인이 해제되었습니다</strong>
                      <span>다시 로그인해 주세요</span>
                    </div>
                  )}
                </div>
                <span>{device}</span>
                <small>{step >= 2 ? '로그아웃' : '로그인 상태'}</small>
              </div>
            ))}
          </div>
        </div>
      )}
    </TimelineDemo>
  );
}

function JudgingDemo({ motion }: { motion: boolean }) {
  const [showProgress, setShowProgress] = useState(true);
  const labels = [
    '제출 접수',
    '컴파일',
    '테스트케이스 채점',
    '채점 마무리',
    '최종 결과',
  ];
  return (
    <div>
      <label className="og-check-option">
        <input
          type="checkbox"
          checked={showProgress}
          onChange={(e) => setShowProgress(e.target.checked)}
        />
        <span>
          참가자에게 채점 진행률 보이기
          <small>꺼도 마지막 채점 결과는 표시됩니다.</small>
        </span>
      </label>
      <TimelineDemo
        motion={motion}
        title="코드 제출에서 결과 확인까지"
        labels={labels}
      >
        {(step) => (
          <div className="og-judging-scene">
            <div className="og-code-card">
              <div className="og-window-top">
                <i />
                <i />
                <i />
                <span>solution.cpp · 예시</span>
              </div>
              <pre>
                <span>{'#include <iostream>'}</span>
                {
                  '\nint main() {\n  std::cout << "Hello, ZOJ!";\n  return 0;\n}'
                }
              </pre>
            </div>
            <div className="og-verdict-card">
              <span
                className={`og-verdict-icon ${step === 4 ? 'is-complete' : ''}`}
              >
                <GuideIcon kind={step === 4 ? 'check' : 'clock'} />
              </span>
              <strong>
                {step === 4 ? '정답' : !showProgress ? '채점 중' : labels[step]}
              </strong>
              {step !== 4 && !showProgress ? (
                <p>진행률과 대기 순번은 가립니다.</p>
              ) : (
                <>
                  <div className="og-progress-track">
                    <i style={{ width: `${step * 25}%` }} />
                  </div>
                  <span>
                    {step === 4
                      ? '최종 결과는 항상 표시'
                      : `예시 진행률 ${step * 25}%`}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </TimelineDemo>
    </div>
  );
}

function NoticeDemo({ motion }: { motion: boolean }) {
  return (
    <TimelineDemo
      motion={motion}
      title="일정 안내가 참가자에게 보이는 방식"
      labels={['안내 준비', '기준 시각 확인', '남은 시간 표시', '시각 도달']}
      caption={(step) =>
        [
          '긴급 안내는 일반 공지 목록과 다른 영역에 표시됩니다.',
          '일정 기반 안내는 대회 설정의 시작·프리즈·종료 시각을 확인하세요.',
          '남은 시간이 바뀌며 참가자가 다음 단계를 준비할 수 있습니다.',
          '수동으로 입력한 문구는 상황이 끝난 뒤 운영자가 확인하고 해제하세요.',
        ][step]
      }
    >
      {(step) => (
        <div className="og-notice-preview">
          <div className="og-mock-page-header">
            <span>ZOJ 예제 대회</span>
            <span>문제 · 제출 · 순위</span>
          </div>
          <div className={`og-emergency ${step > 0 ? 'is-visible' : ''}`}>
            <span className="og-notice-pulse" />
            <div>
              <strong>
                {step === 3
                  ? '프리즈 시각이 되었습니다'
                  : '곧 스코어보드가 프리즈됩니다'}
              </strong>
              <p>제출과 채점은 계속 진행됩니다.</p>
            </div>
            <span className="og-countdown">
              {['00:30', '00:20', '00:10', '00:00'][step]}
            </span>
          </div>
          <div className="og-page-skeleton">
            <span />
            <span />
            <span />
          </div>
          <span className="og-example-label">시간을 압축한 일정 안내 예시</span>
        </div>
      )}
    </TimelineDemo>
  );
}

function QuestionDemo({ motion }: { motion: boolean }) {
  return (
    <TimelineDemo
      motion={motion}
      title="질문을 읽고, 답변하고, 확인하기"
      labels={[
        '질문 접수',
        '운영자가 내용 확인',
        '답변 저장',
        '참가자가 답변 확인',
      ]}
    >
      {(step) => (
        <div className="og-chat">
          <div className="og-chat-bubble">
            <small>참가팀 · 14:10</small>
            <strong>입력의 수가 같을 수도 있나요?</strong>
            <span>문제 A의 조건을 확인하고 싶어요.</span>
          </div>
          <div className={`og-chat-reading ${step > 0 ? 'is-visible' : ''}`}>
            운영자가 질문을 확인하고 있습니다 <span>● ● ●</span>
          </div>
          <div
            className={`og-chat-bubble is-answer ${step >= 2 ? 'is-visible' : ''}`}
          >
            <small>운영자 답변</small>
            <strong>네, 같은 값이 들어올 수 있습니다.</strong>
            <span>조건에 맞춰 중복 값도 처리해 주세요.</span>
          </div>
          <span className={`og-chat-receipt ${step === 3 ? 'is-visible' : ''}`}>
            <GuideIcon kind="check" /> 답변이 질문 상세에 반영됩니다
          </span>
        </div>
      )}
    </TimelineDemo>
  );
}

function AuditDemo({ motion }: { motion: boolean }) {
  return (
    <TimelineDemo
      motion={motion}
      title="이메일과 시각으로 흐름 연결하기"
      labels={['변경 작업', '접속 확인', '메일 발송', '원인 좁히기']}
    >
      {(step) => (
        <div className="og-audit-timeline">
          {[
            [
              '작업 로그',
              '14:10',
              '운영자가 참가팀 정보를 저장했습니다.',
              'flag',
            ],
            [
              '접속 로그',
              '14:12',
              '등록 계정의 로그인 시도가 기록됐습니다.',
              'people',
            ],
            [
              '발송 로그',
              '14:12',
              '안내 메일의 수신자와 발송 상태를 확인합니다.',
              'book',
            ],
          ].map(([title, time, text, icon], index) => (
            <div key={title} className={index <= step ? 'is-reached' : ''}>
              <span className="og-audit-dot">
                <GuideIcon kind={icon} />
              </span>
              <small>{time}</small>
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
              <span>{index <= step ? '확인' : '대기'}</span>
            </div>
          ))}
          <p className={`og-audit-result ${step === 3 ? 'is-visible' : ''}`}>
            같은 이메일 · 같은 시간대 · 서로 다른 기록을 함께 확인하세요.
          </p>
        </div>
      )}
    </TimelineDemo>
  );
}

function DiagnosisDemo({
  onTopic,
}: {
  onTopic: (category: string, article: string) => void;
}) {
  const options = [
    {
      title: '문제가 보이지 않아요',
      icon: 'lock',
      checks: ['대회 상태', '참가 유형', '문제 공개 범위'],
      category: 'help',
      article: 'not-visible',
    },
    {
      title: '채점이 멈춘 것 같아요',
      icon: 'clock',
      checks: ['대기 범위', '번들 상태', '채점기 연결'],
      category: 'submissions',
      article: 'queue-stuck',
    },
    {
      title: '순위가 바뀌지 않아요',
      icon: 'flag',
      checks: ['채점 완료', '프리즈 모드', '공개 단계'],
      category: 'scoreboard',
      article: 'scoreboard-diff',
    },
  ];
  const [selected, setSelected] = useState(0);
  const item = options[selected];
  return (
    <div className="og-timeline-demo">
      <div className="og-demo-top">
        <div>
          <span className="og-eyebrow">증상별 빠른 길찾기</span>
          <h3>어떤 상황인가요?</h3>
        </div>
        <GuideIcon kind="search" />
      </div>
      <div className="og-diagnosis-choices">
        {options.map((option, index) => (
          <button
            type="button"
            key={option.title}
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
          >
            <GuideIcon kind={option.icon} />
            {option.title}
            <GuideIcon kind="arrow" />
          </button>
        ))}
      </div>
      <div key={item.title} className="og-diagnosis-route">
        <Flow
          labels={item.checks}
          step={2}
          icons={['search', 'search', 'check']}
        />
        <button
          className="og-text-link"
          type="button"
          onClick={() => onTopic(item.category, item.article)}
        >
          해결 방법 자세히 읽기 <GuideIcon kind="arrow" />
        </button>
      </div>
      <p className="og-demo-note">
        같은 증상도 원인이 다를 수 있습니다. 제시된 순서로 하나씩 확인하세요.
      </p>
    </div>
  );
}

export default function GuideVisual({
  scene,
  motion,
  onTopic,
}: {
  scene: GuideScene;
  motion: boolean;
  onTopic: (category: string, article: string) => void;
}) {
  if (scene === 'visibility') return <VisibilityDemo />;
  if (scene === 'roles') return <RolesDemo />;
  if (scene === 'session') return <SessionDemo motion={motion} />;
  if (scene === 'judging') return <JudgingDemo motion={motion} />;
  if (scene === 'server-performance')
    return <JudgeServerDemo motion={motion} />;
  if (scene === 'scoreboard') return <ScoreboardDemo motion={motion} />;
  if (scene === 'notice') return <NoticeDemo motion={motion} />;
  if (scene === 'question') return <QuestionDemo motion={motion} />;
  if (scene === 'audit') return <AuditDemo motion={motion} />;
  if (scene === 'diagnosis') return <DiagnosisDemo onTopic={onTopic} />;
  const journeys = {
    journey: {
      title: '대회 운영의 다섯 단계',
      labels: ['기본 설정', '팀·문제 준비', '리허설', '대회 진행', '순위 발표'],
      icons: ['flag', 'people', 'code', 'clock', 'spark'],
      details: [
        '일정과 공개 범위를 정하고 저장합니다.',
        '참가 유형별로 팀과 문제를 준비합니다.',
        '권한·화면·채점을 실제 제출로 점검합니다.',
        '공지·질문·제출과 채점 대기를 모니터링합니다.',
        '남은 채점을 확인하고 계획한 방식으로 공개합니다.',
      ],
    },
    pipeline: {
      title: '문제 한 개가 채점 준비를 마치기까지',
      labels: ['본문·예제', '입력·출력', '활성 세트', '채점 번들', '검증 제출'],
      icons: ['book', 'code', 'check', 'flag', 'spark'],
      details: [
        '문제를 저장하고 설명과 예제를 확인합니다.',
        '입력과 기대 출력의 짝을 맞춥니다.',
        '실제로 사용할 테스트케이스 세트를 확인합니다.',
        '번들 생성 상태와 오류 메시지를 확인합니다.',
        '정답·오답 코드로 채점이 의도대로 동작하는지 확인합니다.',
      ],
    },
    review: {
      title: '읽는 검수에서 실행하는 검수로',
      labels: [
        '문제 읽기',
        '풀이 작성',
        '코드 제출',
        '결과 확인',
        '출제진 피드백',
      ],
      icons: ['book', 'code', 'arrow', 'check', 'people'],
      details: [
        '조건·범위·예제의 모호함을 찾습니다.',
        '최소·최대·경계 조건을 고려합니다.',
        '자신의 검수 코드를 실행합니다.',
        '실행 시간·메모리·오류를 확인합니다.',
        '문구와 데이터의 수정이 필요하면 출제진과 공유합니다.',
      ],
    },
  };
  const item = journeys[scene];
  return (
    <TimelineDemo
      motion={motion}
      title={item.title}
      labels={item.labels}
      caption={(step) => item.details[step]}
    >
      {(step) => (
        <div className="og-flow-scene">
          <Flow labels={item.labels} icons={item.icons} step={step} />
          <div className="og-stage-card" key={step}>
            <span className="og-stage-number">0{step + 1}</span>
            <div>
              <small>이 단계에서 할 일</small>
              <strong>{item.details[step]}</strong>
            </div>
            <GuideIcon kind={item.icons[step]} />
          </div>
        </div>
      )}
    </TimelineDemo>
  );
}
