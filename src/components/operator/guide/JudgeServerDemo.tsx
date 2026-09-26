import { useState } from 'react';
import ProblemReviewResult from '@/components/operator/ProblemReviewResult';
import { guideTime } from './guideFixtures';
import { judgeBenchmark } from '@/data/judgeBenchmark';
import JudgeBenchmarkExamples from './JudgeBenchmarkExamples';
import { judgeInfrastructure } from '@/data/judgeInfrastructure';

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
export default function JudgeServerDemo() {
  const [view, setView] = useState('examples');
  const [selected, setSelected] = useState('loop-cpp');
  const [step, setStep] = useState(0);
  function jump(index: number) {
    setStep(index);
  }
  const example = judgeBenchmark.cases.find((item) => item.id === selected)!;
  const current = flow[step];

  return (
    <div className="og-timeline-demo og-server-demo">
      <div className="og-demo-top">
        <div>
          <span className="og-eyebrow">ZOJ가 제공하는 채점 환경</span>
          <h3>코드가 결과가 되기까지</h3>
        </div>
        <span className="og-example-label">
          {judgeBenchmark.displayDate} 기준
        </span>
      </div>
      <div className="og-runtime-facts">
        <div>
          <strong>{judgeInfrastructure.vm.planned_count}대</strong>
          <span>축소 운영 기준 · 실제 연결 수와 구분</span>
        </div>
        <div>
          <strong>{judgeInfrastructure.vm.vcpus_per_agent} vCPU</strong>
          <span>각 채점 VM의 CPU 할당</span>
        </div>
        <div>
          <strong>{judgeInfrastructure.vm.memory_gib_per_agent}GiB</strong>
          <span>각 채점 VM의 메모리 할당</span>
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
          기존 7대 구성 실행 기록
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
        <JudgeBenchmarkExamples example={example} onSelect={setSelected} />
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
        제한·테스트·검증 코드를 관리합니다. 제공 구성은{' '}
        {judgeBenchmark.displayDate} 기준이며, 현재 연결 상태는 채점 현황에
        표시됩니다.
      </p>
    </div>
  );
}
