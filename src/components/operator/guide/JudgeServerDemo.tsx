import { useState } from 'react';
import ProblemReviewResult from '@/components/operator/ProblemReviewResult';
import { guideTime } from './guideFixtures';
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
  },
  {
    title: '빈 슬롯에서 작업 요청',
    actor: '채점 에이전트',
    text: '빈 자리가 있는 에이전트가 작업을 요청합니다. 서버가 일반 채점을 AI 검증 실행보다 먼저 고르고, 같은 우선순위 안에서는 큐 순서로 배정합니다.',
    status: '채점 대기',
  },
  {
    title: '한 에이전트에 배정',
    actor: 'ZOJ 서버',
    text: '제출 A를 한 에이전트에 임대하고 작업 전용 토큰을 발급합니다. 동시에 다른 에이전트가 요청해도 같은 작업을 함께 가져가지 못하게 합니다.',
    status: '준비 중',
  },
  {
    title: '자료 준비와 컴파일',
    actor: '배정된 에이전트',
    text: '문제·제한·테스트·checker를 준비합니다. 번들이 있으면 묶어서 받고, C/C++/Java는 격리 환경에서 컴파일합니다. Python은 소스를 준비합니다.',
    status: '준비 중',
  },
  {
    title: '테스트별 격리 실행',
    actor: 'isolate 샌드박스',
    text: '각 입력으로 프로그램을 새로 실행하고 시간·메모리·출력 제한을 적용합니다. 제출 요약에는 집계된 테스트의 시간과 메모리 최댓값이 각각 들어갑니다.',
    status: '채점 중',
  },
  {
    title: '출력 확인',
    actor: 'checker 또는 기본 비교',
    text: '정상 종료만으로 정답이 되지 않습니다. checker가 있으면 입력·실제 출력·기대 출력으로 검증하고, 없으면 기본 출력 비교를 합니다.',
    status: '채점 중',
  },
  {
    title: '결과 저장과 슬롯 반환',
    actor: '에이전트 → ZOJ 서버',
    text: '에이전트가 진행률과 최종 결과를 보고합니다. 서버는 인증과 유효한 임대 토큰을 확인해 결과를 저장하고, 에이전트는 다음 작업을 가져옵니다.',
    status: '판정 완료',
  },
];
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const mib = (kb: number) => (kb / 1024).toFixed(2);

export default function JudgeServerDemo() {
  const [view, setView] = useState('examples');
  const [selected, setSelected] = useState('loop-cpp');
  const [step, setStep] = useState(0);
  function jump(index: number) {
    setStep(index);
  }
  const example = judgeBenchmark.cases.find((item) => item.id === selected)!;
  const times = example.runs.map((run) => run.runtime_ms);
  const memories = example.runs.map((run) => run.memory_kb);
  const current = flow[step];

  return (
    <div className="og-timeline-demo og-server-demo">
      <div className="og-demo-top">
        <div>
          <span className="og-eyebrow">ZOJ가 제공하는 채점 환경</span>
          <h3>코드가 결과가 되기까지</h3>
        </div>
        <span className="og-example-label">2026. 9. 25. 기준</span>
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
          <span>제공 에이전트 버전</span>
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
              <span>메모리 최댓값</span>
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
              측정 조건은 예제별 테스트 1개·3회 실행, 언어별 시간 제한
              3,000ms·메모리 제한 256MB입니다. 기본 언어 보정은 적용하지 않은
              결과입니다. 측정 중 다른 제출의 채점 대기·실행 작업은 0건입니다.
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
              측정 시각은 2026. 9. 25. 23:54 KST입니다. 노드는 일반 채점과 같은
              큐에서 자동 배정됩니다. 아래 값은 해당 입력·제한·실행 회차의
              결과입니다. 실행 시간은 입력과 동시 부하에 따라 달라집니다.
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
          <div
            className="og-practice-tabs"
            role="group"
            aria-label="채점 처리 단계"
          >
            {flow.map((item, index) => (
              <button
                type="button"
                key={item.title}
                aria-pressed={step === index}
                onClick={() => jump(index)}
              >
                {index + 1}. {item.title}
              </button>
            ))}
          </div>
          <ProblemReviewResult
            run={{
              id: 'guide-flow',
              problemId: 'guide-runtime',
              language: example.language,
              sourceCode: example.source,
              startedAt: guideTime,
              phase: step === 6 ? 'done' : 'judging',
              submission: {
                submission_id: 'guide-flow',
                problem_id: 'guide-runtime',
                language: example.language,
                status:
                  step < 2
                    ? 'waiting'
                    : step < 4
                      ? 'preparing'
                      : step < 6
                        ? 'judging'
                        : 'accepted',
                submitted_at: guideTime,
                progress_current: step === 4 ? 0 : 1,
                progress_total: 1,
                runtime_ms: step === 6 ? example.runs[0].runtime_ms : null,
                memory_kb: step === 6 ? example.runs[0].memory_kb : null,
              },
            }}
            onResume={() => {}}
          />
          <div className="og-flow-detail" aria-live="polite">
            <span>
              {current.actor} · {current.status}
            </span>
            <h4>
              {step + 1}. {current.title}
            </h4>
            <p>{current.text}</p>
          </div>
          <p className="og-demo-note">
            단계를 선택하면 실제 검수 결과 화면의 상태가 바뀝니다. 마지막 화면은
            선택한 예제의 1회차 저장 결과입니다. 대기와 준비 시간은 풀이 실행
            시간에 포함되지 않습니다.
          </p>
        </section>
      )}
      <p className="og-demo-note">
        서버 설치·자원 배정·채점기 운영은 ZOJ가 담당합니다. 운영자는 문제의
        제한·테스트·검증 코드를 관리합니다. 제공 구성은 2026. 9. 25. 기준이며,
        현재 연결 상태는 채점 현황에 표시됩니다.
      </p>
    </div>
  );
}
