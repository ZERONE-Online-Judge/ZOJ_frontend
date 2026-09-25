import { useEffect, useRef, useState } from 'react';
import { judgeBenchmark } from '@/data/judgeBenchmark';

const languageNames: Record<string, string> = {
  cpp17: 'C++17',
  python313: 'Python 3.13',
  java8: 'Java 8 호환',
};
const flow = [
  {
    title: '제출과 작업 저장',
    actor: 'ZOJ 서버',
    text: '소스와 제출 기록을 저장하고 채점 작업을 대기열에 넣습니다. 아직 풀이 실행 시간은 측정하지 않습니다.',
    status: '채점 대기',
    queue: ['제출 A', '제출 B', 'AI 검증 C'],
  },
  {
    title: '빈 슬롯에서 작업 요청',
    actor: '채점 에이전트',
    text: '빈 자리가 있는 에이전트가 작업을 요청합니다. 서버가 일반 채점을 AI 검증 실행보다 먼저 고르고, 같은 우선순위 안에서는 큐 순서로 배정합니다.',
    status: '채점 대기',
    queue: ['제출 A', '제출 B', 'AI 검증 C'],
  },
  {
    title: '한 에이전트에 배정',
    actor: 'ZOJ 서버',
    text: '제출 A를 한 에이전트에 임대하고 작업 전용 토큰을 발급합니다. 동시에 다른 에이전트가 요청해도 같은 작업을 함께 가져가지 못하게 합니다.',
    status: '준비 중',
    queue: ['제출 B', 'AI 검증 C'],
  },
  {
    title: '자료 준비와 컴파일',
    actor: '배정된 에이전트',
    text: '문제·제한·테스트·checker를 준비합니다. 번들이 있으면 묶어서 받고, C/C++/Java는 격리 환경에서 컴파일합니다. Python은 소스를 준비합니다.',
    status: '준비 중',
    queue: ['제출 B', 'AI 검증 C'],
  },
  {
    title: '테스트별 격리 실행',
    actor: 'isolate 샌드박스',
    text: '각 입력으로 프로그램을 새로 실행하고 시간·메모리·출력 제한을 적용합니다. 제출 요약에는 집계된 테스트의 시간과 메모리 최댓값이 각각 들어갑니다.',
    status: '채점 중',
    queue: ['제출 B', 'AI 검증 C'],
  },
  {
    title: '출력 확인',
    actor: 'checker 또는 기본 비교',
    text: '정상 종료만으로 정답이 되지 않습니다. checker가 있으면 입력·실제 출력·기대 출력으로 검증하고, 없으면 기본 출력 비교를 합니다.',
    status: '채점 중',
    queue: ['제출 B', 'AI 검증 C'],
  },
  {
    title: '결과 저장과 슬롯 반환',
    actor: '에이전트 → ZOJ 서버',
    text: '에이전트가 진행률과 최종 결과를 보고합니다. 서버는 인증과 유효한 임대 토큰을 확인해 결과를 저장하고, 에이전트는 다음 작업을 가져옵니다.',
    status: '판정 완료',
    queue: ['제출 B', 'AI 검증 C'],
  },
];
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const mib = (kb: number) => (kb / 1024).toFixed(2);

export default function JudgeServerDemo({ motion }: { motion: boolean }) {
  const [view, setView] = useState('examples');
  const [selected, setSelected] = useState('loop-cpp');
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!root.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (view !== 'flow' || !motion || !playing || !visible) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'hidden')
        setStep((value) => (value + 1) % flow.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [view, motion, playing, visible]);
  function jump(index: number) {
    setPlaying(false);
    setStep(index);
  }
  const example = judgeBenchmark.cases.find((item) => item.id === selected)!;
  const times = example.runs.map((run) => run.runtime_ms);
  const memories = example.runs.map((run) => run.memory_kb);
  const current = flow[step];
  const active = motion && playing;
  return (
    <div className="og-timeline-demo og-server-demo" ref={root}>
      <div className="og-demo-top">
        <div>
          <span className="og-eyebrow">ZOJ가 제공하는 채점 환경</span>
          <h3>코드가 결과가 되기까지</h3>
        </div>
        <span className="og-example-label">2026. 9. 25. 확인</span>
      </div>
      <div className="og-runtime-facts">
        <div>
          <strong>7대</strong>
          <span>운영 채점 에이전트</span>
        </div>
        <div>
          <strong>14개</strong>
          <span>전체 제출 슬롯 · 노드당 2개</span>
        </div>
        <div>
          <strong>v0.2.18</strong>
          <span>확인된 에이전트 버전</span>
        </div>
      </div>
      <div
        className="og-server-scenarios"
        role="group"
        aria-label="채점 환경 안내 선택"
      >
        <button
          type="button"
          aria-pressed={view === 'examples'}
          onClick={() => setView('examples')}
        >
          실제 실행 예제
        </button>
        <button
          type="button"
          aria-pressed={view === 'flow'}
          onClick={() => setView('flow')}
        >
          채점 큐부터 결과까지
        </button>
      </div>
      {view === 'examples' ? (
        <section className="og-measured-example" aria-label="실측 실행 예제">
          <label className="og-benchmark-select">
            확인할 코드
            <select
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
            >
              {judgeBenchmark.cases.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} · {languageNames[item.language]}
                </option>
              ))}
            </select>
          </label>
          <div className="og-benchmark-metrics" aria-live="polite">
            <div>
              <span>표시 시간 중앙값</span>
              <strong>
                {median(times).toLocaleString()}
                <small>ms</small>
              </strong>
              <p>
                3회 범위 {Math.min(...times)}~{Math.max(...times)}ms
              </p>
            </div>
            <div>
              <span>보고 메모리 최댓값</span>
              <strong>
                {mib(Math.max(...memories))}
                <small>MiB</small>
              </strong>
              <p>{Math.max(...memories).toLocaleString()}KiB · 원시 값 기준</p>
            </div>
            <div>
              <span>실제 판정</span>
              <strong>
                정답<small>3 / 3회</small>
              </strong>
              <p>각 실행은 테스트 1개</p>
            </div>
          </div>
          <div className="og-benchmark-code">
            <div>
              <strong>실행한 코드</strong>
              <span>{languageNames[example.language]}</span>
            </div>
            <pre tabIndex={0} aria-label="실행한 소스 코드">
              <code>{example.source}</code>
            </pre>
          </div>
          <div className="og-benchmark-io">
            <div>
              <span>입력</span>
              <pre>{example.input || '(입력 없음)'}</pre>
            </div>
            <div>
              <span>기대 출력 = 실제 출력</span>
              <pre>{example.output}</pre>
            </div>
          </div>
          <p className="og-server-takeaway">{example.note}</p>
          <details className="og-benchmark-records">
            <summary>3회 측정값과 조건 보기</summary>
            <p>
              운영 큐에 한 번에 1개씩 요청했습니다. 모든 예제는 언어별 제한을
              3,000ms / 256MB로 명시해 언어 보정을 적용하지 않았습니다. 사용자
              채점 대기·실행 작업이 없는 것을 매번 확인했습니다.
            </p>
            <div className="og-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>회차</th>
                    <th>채점기</th>
                    <th>시간</th>
                    <th>메모리</th>
                  </tr>
                </thead>
                <tbody>
                  {example.runs.map((run, index) => (
                    <tr key={index}>
                      <th>{index + 1}회</th>
                      <td>{run.node.slice(-2)}번</td>
                      <td>{run.runtime_ms}ms</td>
                      <td>{run.memory_kb.toLocaleString()}KiB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              노드는 자동 배정됐습니다. 물리 호스트의 전체 부하는 측정하지
              않았고, 모든 노드를 동일 조건으로 비교한 성능 보증 자료도
              아닙니다. 측정 시각: 2026. 9. 25. 23:54 KST.
            </p>
          </details>
          <a
            className="og-benchmark-download"
            href="/guides/judge-benchmark-2026-09-25.json"
            download
          >
            예제 8종 · 소스와 측정 기록 다운로드 ↓
          </a>
        </section>
      ) : (
        <section className="og-judge-flow" aria-label="채점 처리 과정">
          <div className="og-flow-map" aria-hidden="true">
            <div className={step < 2 ? 'is-current' : ''}>
              <small>01</small>
              <strong>공통 대기열</strong>
              {current.queue.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <i>→</i>
            <div className={step >= 2 && step < 6 ? 'is-current' : ''}>
              <small>02</small>
              <strong>채점 에이전트</strong>
              <span className={step >= 2 && step < 6 ? 'is-occupied' : ''}>
                슬롯 1 · {step >= 2 && step < 6 ? '제출 A' : '비어 있음'}
              </span>
              <span>슬롯 2 · 비어 있음</span>
            </div>
            <i>→</i>
            <div className={step === 6 ? 'is-current' : ''}>
              <small>03</small>
              <strong>저장된 결과</strong>
              <span>
                {step === 6 ? 'A · 판정 / 시간 / 메모리' : '아직 결과 없음'}
              </span>
            </div>
          </div>
          <div className="og-flow-detail" aria-live={active ? 'off' : 'polite'}>
            <span>
              {current.actor} · {current.status}
            </span>
            <h4>
              {step + 1}. {current.title}
            </h4>
            <p>{current.text}</p>
          </div>
          <div className="og-player">
            <button
              type="button"
              disabled={!motion}
              onClick={() => setPlaying(!playing)}
              aria-label={active ? '채점 과정 일시정지' : '채점 과정 재생'}
            >
              {active ? 'Ⅱ 일시정지' : '▶ 재생'}
            </button>
            <div className="og-player-steps" aria-label="채점 과정 단계">
              {flow.map((item, index) => (
                <button
                  type="button"
                  key={item.title}
                  aria-label={`${index + 1}단계: ${item.title}`}
                  aria-pressed={step === index}
                  onClick={() => jump(index)}
                >
                  <span />
                  {index + 1}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => jump((step + 1) % flow.length)}
            >
              다음 →
            </button>
          </div>
          <p className="og-demo-note">
            흐름 그림의 제출 A·B·C는 설명용입니다. 실제 큐나 특정 에이전트를
            조작하지 않습니다. 임대가 만료된 작업은 다시 배정될 수 있으며,
            오래된 토큰으로 보낸 결과는 반영하지 않습니다.
          </p>
        </section>
      )}
      <p className="og-demo-note">
        구성과 실측값은 확인 날짜의 기록입니다. 현재 가동 상태는 채점 현황에서
        확인하세요. 서버 설치·자원 배정은 ZOJ가 담당하고, 운영자는 문제의
        제한·테스트·검증 코드를 관리합니다.
      </p>
    </div>
  );
}
