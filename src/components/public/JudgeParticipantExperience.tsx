import { useState } from 'react';
import { ExperienceReveal } from '@/components/common/PublicExperience';
import ContestScoreboardProblemCell from '@/components/contest/scoreboard/ContestScoreboardProblemCell';
import {
  submissionStatusLabel,
  submissionStatusTone,
} from '@/domains/submissionScoreboard/status';
import { participantJudgeBenchmark as benchmark } from '@/data/participantJudgeBenchmark';
import './JudgeParticipantExperience.css';

const journey = [
  {
    status: 'waiting',
    title: '차례를 기다려요',
    description:
      '접수된 코드는 대기열에 들어갑니다. 빈 실행 자리가 생기면 채점 에이전트가 작업을 가져가요.',
    detail: '접수 완료 · 채점 서버 배정 대기',
    progress: 0,
  },
  {
    status: 'preparing',
    title: '실행을 준비해요',
    description:
      '문제의 테스트 자료를 준비하고, 필요한 언어는 컴파일합니다. 컴파일에 실패하면 여기서 결과가 나와요.',
    detail: '테스트 자료 준비 → 컴파일',
    progress: 0,
  },
  {
    status: 'judging',
    title: '테스트로 확인해요',
    description:
      '격리된 환경에서 테스트마다 코드를 실행해요. 시간·메모리 제한을 확인하고, 문제의 채점 프로그램이 출력을 검사합니다.',
    detail: '테스트 3 / 5 · 60%',
    progress: 60,
  },
  {
    status: 'accepted',
    title: '결과가 도착해요',
    description:
      '판정과 실행 시간·메모리가 저장됩니다. 채점현황에서 확인할 수 있고, 정답이면 스코어보드에도 반영돼요.',
    detail: '테스트 5 / 5 · 결과 저장 완료',
    progress: 100,
  },
] as const;

const verdicts = [
  {
    status: 'accepted',
    short: 'AC',
    title: '준비된 테스트를 모두 통과했어요.',
    description:
      '문제의 출력 조건과 자원 제한을 만족했습니다. 등록된 테스트에 대한 정답 판정이에요.',
    next: '다음 문제에 도전해 볼까요?',
    visual: ['테스트 01  ✓', '테스트 02  ✓', '테스트 03  ✓'],
  },
  {
    status: 'wrong_answer',
    short: 'WA',
    title: '출력이 정답 조건과 달라요.',
    description:
      '예제는 맞아도 다른 입력에서 실패할 수 있어요. 경계값, 중복, 정렬 조건과 자료형 범위를 살펴보세요.',
    next: '작은 입력을 직접 만들어 기대한 답과 비교해 보세요.',
    visual: ['입력         2 3', '기대 출력    5', '내 출력      -1'],
  },
  {
    status: 'compile_error',
    short: 'CE',
    title: '실행 파일을 만들지 못했어요.',
    description:
      '컴파일 단계의 오류입니다. 선택한 언어와 문법, 라이브러리 사용을 확인해 주세요.',
    next: '제출 상세의 컴파일 메시지에서 오류 위치를 확인하세요.',
    visual: ['int answer = 5', '              ^', 'error: expected ;'],
  },
  {
    status: 'runtime_error',
    short: 'RE',
    title: '실행 도중 프로그램이 종료됐어요.',
    description:
      '배열 범위 초과, 0으로 나누기, 처리하지 않은 예외 등을 확인해 보세요.',
    next: '최소·최대 입력에서도 정상 종료하는지 살펴보세요.',
    visual: ['배열 크기     3', '유효 인덱스   0  1  2', '접근 위치     3  ✕'],
  },
  {
    status: 'time_limit_exceeded',
    short: 'TLE',
    title: '허용된 실행 시간을 넘었어요.',
    description:
      '입력이 커질 때 반복 횟수가 얼마나 늘어나는지 확인해요. 무한 반복이나 느린 입출력도 원인이 됩니다.',
    next: '문제와 언어에 적용되는 시간 제한을 확인하세요.',
    visual: [
      '실행 시작     ━━━━━━━▶',
      '시간 제한     ┃',
      '제한 도달 → 실행 중단',
    ],
  },
  {
    status: 'memory_limit_exceeded',
    short: 'MLE',
    title: '사용할 수 있는 메모리를 넘었어요.',
    description:
      '큰 배열, 너무 많은 객체, 깊은 재귀처럼 메모리가 늘어나는 부분을 찾아보세요.',
    next: '최대 입력 기준으로 자료구조 크기를 계산해 보세요.',
    visual: ['배열 + 객체 + 실행 환경', '▰ ▰ ▰ ▰ ▰ ▰ ▰', '메모리 제한 초과'],
  },
  {
    status: 'output_limit_exceeded',
    short: 'OLE',
    title: '출력한 데이터가 너무 많아요.',
    description:
      '출력량이 허용 범위를 넘었습니다. 디버그 출력이나 끝나지 않는 출력 반복문을 확인해 주세요.',
    next: '문제에서 요구한 내용만 출력해 주세요.',
    visual: ['debug: 1', 'debug: 2', 'debug: … → 출력 제한'],
  },
  {
    status: 'output_format_error',
    short: 'FORMAT',
    title: '출력 형식을 확인해 주세요.',
    description:
      '채점 프로그램이 형식 오류로 구분한 결과입니다. 줄바꿈·공백·요구 형식을 확인해요. 문제에 따라 틀렸습니다로 표시될 수도 있습니다.',
    next: '문제의 출력 설명과 채점 메시지를 함께 확인하세요.',
    visual: [
      '요구 형식     YES',
      '내 출력       Answer: YES',
      '불필요한 문구 확인',
    ],
  },
  {
    status: 'system_error',
    short: 'SYSTEM',
    title: '채점 과정에 문제가 생겼어요.',
    description:
      '풀이가 틀렸다는 뜻은 아닙니다. 채점 환경이나 문제 자료를 운영자가 확인해야 해요.',
    next: '제출 번호와 오류 메시지를 대회 운영자에게 알려 주세요.',
    visual: ['코드 접수     ✓', '채점 처리     !', '운영자 확인 필요'],
  },
] as const;

function VerdictBadge({ status }: { status: string }) {
  return (
    <span className={`judge-demo-badge is-${submissionStatusTone(status)}`}>
      {submissionStatusLabel(status)}
    </span>
  );
}

function Journey() {
  const [step, setStep] = useState(0);
  const current = journey[step];
  return (
    <section className="experience-soft-section" id="judge-journey">
      <div className="experience-container experience-section">
        <ExperienceReveal>
          <div className="experience-section-heading">
            <div>
              <p className="experience-eyebrow">A CODE’S JOURNEY</p>
              <h2>
                기다리는 동안에도,
                <br />
                코드는 앞으로 가고 있어요.
              </h2>
            </div>
            <p>단계를 눌러 채점 과정을 따라가 보세요.</p>
          </div>
          <div
            className="judge-flow-steps"
            role="group"
            aria-label="채점 과정 예시 단계"
          >
            {journey.map((item, index) => (
              <button
                type="button"
                key={item.status}
                aria-pressed={index === step}
                onClick={() => setStep(index)}
                className={index <= step ? 'is-reached' : ''}
              >
                <span>0{index + 1}</span>
                {index === 3 ? '결과 도착' : submissionStatusLabel(item.status)}
              </button>
            ))}
          </div>
          <div className="judge-demo-surface judge-flow-demo">
            <div className="judge-demo-copy" aria-live="polite">
              <p className="judge-small-label">채점 흐름 예시</p>
              <h3 key={current.title} className="judge-animate-in">
                {current.title}
              </h3>
              <p>{current.description}</p>
              <button
                type="button"
                className="experience-text-link"
                onClick={() => setStep((step + 1) % journey.length)}
              >
                {step === 3 ? '처음부터 다시 보기 ↺' : '다음 단계 보기 →'}
              </button>
            </div>
            <div
              className="judge-submission-preview"
              aria-label="채점현황 예시"
            >
              <div className="judge-window-title">
                <span>
                  <i />
                  <i />
                  <i />
                </span>
                채점현황 · 예시
              </div>
              <div className="judge-preview-row">
                <span>
                  A. 두 수의 합<small>solution.cpp · C++17</small>
                </span>
                <VerdictBadge status={current.status} />
              </div>
              <div
                className="judge-demo-progress"
                role="progressbar"
                aria-label="예시 테스트 진행률"
                aria-valuenow={current.progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${current.progress}%` }} />
              </div>
              <p className="judge-preview-detail">{current.detail}</p>
              <div className="judge-test-dots" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    className={
                      step === 3 || (step === 2 && i < 3) ? 'is-done' : ''
                    }
                    key={i}
                  >
                    {step === 3 || (step === 2 && i < 3)
                      ? '✓'
                      : String(i + 1).padStart(2, '0')}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <p className="judge-section-footnote">
            위 화면은 설명용 예시예요. 여러 제출을 동시에 처리하므로 제출 순서와
            결과 도착 순서는 다를 수 있어요.
          </p>
        </ExperienceReveal>
      </div>
    </section>
  );
}

function Performance() {
  return (
    <section
      className="experience-container experience-section"
      id="judge-performance"
    >
      <ExperienceReveal>
        <div className="experience-section-heading">
          <div>
            <p className="experience-eyebrow">A FEEL FOR SPEED</p>
            <h2>1억 번 계산하면, 이만큼 걸려요.</h2>
          </div>
          <p>ZOJ 채점기에서 언어별 5회 실행한 평균이에요.</p>
        </div>
        <div className="judge-speed-reference">
          {benchmark.cases.map((item, index) => (
            <article
              className={`judge-speed-card ${index < 2 ? 'is-cpp' : 'is-python'}`}
              key={item.id}
            >
              <span>{item.label}</span>
              <p>
                <strong>{(item.runtimeMs.mean / 1000).toFixed(3)}</strong>
                <span>초</span>
              </p>
              <small>
                최소 {(item.runtimeMs.min / 1000).toFixed(3)} · 최대{' '}
                {(item.runtimeMs.max / 1000).toFixed(3)}초
              </small>
            </article>
          ))}
        </div>
        <div className="judge-speed-example">
          <span className="judge-small-label">무엇을 계산했나요?</span>
          <p>
            <code>total += i % 97</code> — 나머지를 구하고 더하는 일을{' '}
            <strong>1억 번</strong> 반복했어요.
            <br />N = 10,000인 N² 풀이도 반복 횟수는 1억 번이므로, 풀이의 규모를
            가늠할 때 참고하세요.
          </p>
        </div>
        <p className="judge-section-footnote">
          {benchmark.displayDate} 실측 · 각 언어 5회 모두 정답. 반복문 안에서
          하는 일과 최적화에 따라 시간은 달라져요. 대기·컴파일 시간은 포함하지
          않아요.
        </p>
        <details className="judge-inline-details judge-speed-evidence">
          <summary>측정 조건과 실행 기록 보기</summary>
          <div>
            <p>
              입력으로 반복 횟수 100,000,000을 받아 0부터 99,999,999까지
              계산하고, 합계 4,799,999,352를 출력해 정답을 확인했습니다. 언어별
              5회 실행 시간을 모두 더해 5로 나눈 산술평균입니다. 최솟값·최댓값도
              같은 5회 기록에서 가져왔어요.
            </p>
            <p>
              실제 채점 큐에 한 번에 한 작업씩 넣고, 매번 새 프로세스로
              실행했습니다. 별도 준비 실행을 제외하지 않았으며 Java 실행
              시간에는 JVM 시작과 JIT 비용도 포함됩니다. 다른 채점 작업 유입이
              없는 조건에서 측정했습니다.
            </p>
            <p>
              공통 CPU는 {benchmark.environment.cpu}입니다. C99·C++17은 GCC{' '}
              {benchmark.environment.gcc} / -O2, Python은 CPython{' '}
              {benchmark.environment.python}, Java는 서비스의 Java 8 호환 채점
              환경입니다. 측정용 제한은 모든 언어에 120초·256MB를 동일하게
              적용했으며, 실제 대회 문제의 제한과는 별개입니다.
            </p>
            <p>
              표시 시간은 채점기에 저장된 테스트 실행 시간이며 격리 실행 준비와
              프로세스 시작을 포함합니다. 이 수치를 모든 종류의 연산에 같은
              속도로 적용할 수는 없어요.
            </p>
            <a
              href={benchmark.snapshotPath}
              download
              className="experience-text-link"
            >
              4개 언어 코드와 전체 20회 기록 다운로드 ↓
            </a>
          </div>
        </details>
      </ExperienceReveal>
    </section>
  );
}

function Verdicts() {
  const [selected, setSelected] = useState(0);
  const verdict = verdicts[selected];
  return (
    <section className="experience-soft-section" id="judge-verdicts">
      <div className="experience-container experience-section">
        <ExperienceReveal>
          <div className="experience-section-heading">
            <div>
              <p className="experience-eyebrow">READ YOUR RESULT</p>
              <h2>결과 한 줄에 담긴 이야기.</h2>
            </div>
            <p>판정을 고르면 의미와 다음에 확인할 것이 보여요.</p>
          </div>
          <div className="judge-verdict-layout">
            <div
              className="judge-verdict-options"
              role="group"
              aria-label="채점 결과 종류"
            >
              {verdicts.map((item, index) => (
                <button
                  type="button"
                  key={item.status}
                  aria-pressed={selected === index}
                  onClick={() => setSelected(index)}
                >
                  <span>{item.short}</span>
                  {submissionStatusLabel(item.status)}
                  <i aria-hidden="true">↗</i>
                </button>
              ))}
            </div>
            <div
              className={`judge-verdict-detail is-${submissionStatusTone(verdict.status)}`}
              aria-live="polite"
            >
              <VerdictBadge status={verdict.status} />
              <div key={verdict.status} className="judge-animate-in">
                <h3>{verdict.title}</h3>
                <p>{verdict.description}</p>
                <pre className="judge-verdict-visual">
                  <code>{verdict.visual.join('\n')}</code>
                </pre>
                <span className="judge-small-label">다음 한 걸음</span>
                <p className="judge-verdict-next">{verdict.next}</p>
              </div>
              <p className="judge-card-caption">
                입력·출력과 메시지는 이해를 돕는 예시입니다.
              </p>
            </div>
          </div>
        </ExperienceReveal>
      </div>
    </section>
  );
}

function Scoreboard() {
  const [wrong, setWrong] = useState(2);
  const [solved, setSolved] = useState(false);
  const penalty = solved ? 35 + wrong * 20 : 0;
  return (
    <section
      className="experience-container experience-section"
      id="judge-scoreboard"
    >
      <ExperienceReveal>
        <div className="experience-section-heading">
          <div>
            <p className="experience-eyebrow">EVERY SOLVE COUNTS</p>
            <h2>
              한 문제의 정답이,
              <br />
              순위를 바꾸는 순간.
            </h2>
          </div>
          <p>먼저 해결 수, 그다음 총시간을 비교해요.</p>
        </div>
        <div className="judge-score-layout">
          <div className="judge-score-explanation">
            <ol className="judge-rank-rules">
              <li>
                <span>01</span>
                <div>
                  <h3>더 많이 풀수록 앞에</h3>
                  <p>맞힌 문제 수가 많은 팀이 높은 순위예요.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <h3>같이 풀었다면, 더 적은 총시간</h3>
                  <p>
                    정답 제출까지의 대회 경과 시간에, 그 문제의 정답 전 실패
                    1회당 20분을 더해요.
                  </p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <h3>총시간까지 같다면</h3>
                  <p>
                    못 푼 문제에서 집계된 실패 횟수가 적은 팀이 앞서요. 이것도
                    같으면 공동 순위예요.
                  </p>
                </div>
              </li>
            </ol>
            <p className="judge-card-caption">
              시간은 채점 완료 시각이 아닌 <strong>제출 시각</strong>을 기준으로
              분 단위(초 버림)로 계산해요. 채점 대기로 점수 시간이 늘어나지는
              않아요.
            </p>
          </div>
          <div className="judge-demo-surface judge-score-demo">
            <p className="judge-small-label">우리 팀의 A번 문제 · 계산 예시</p>
            <h3>35분에 정답을 제출한다면?</h3>
            <div className="judge-burst-control">
              <span>그 전에 틀린 횟수</span>
              <div
                className="judge-segmented"
                role="group"
                aria-label="정답 전 오답 횟수"
              >
                {[0, 1, 2].map((count) => (
                  <button
                    type="button"
                    key={count}
                    aria-pressed={wrong === count}
                    onClick={() => setWrong(count)}
                  >
                    {count}회
                  </button>
                ))}
              </div>
            </div>
            <div className="judge-mini-scoreboard" aria-live="polite">
              <div>
                <span>팀</span>
                <span>해결</span>
                <span>A</span>
                <span>총시간</span>
              </div>
              <div>
                <strong>우리 팀</strong>
                <b>{solved ? 1 : 0}</b>
                <span key={`${wrong}-${solved}`} className="judge-animate-in">
                  <ContestScoreboardProblemCell
                    score={{
                      problem_code: 'A',
                      attempts: wrong,
                      wrong_attempts: wrong,
                      solved,
                      best_status: solved ? 'accepted' : null,
                      penalty: solved ? penalty : null,
                    }}
                  />
                </span>
                <b key={penalty} className="judge-animate-in">
                  {penalty}분
                </b>
              </div>
            </div>
            <div className="judge-score-equation" aria-live="polite">
              {solved ? (
                <>
                  <span>
                    35<small>정답 제출 시점</small>
                  </span>
                  <i>+</i>
                  <span>
                    {wrong} × 20<small>정답 전 실패</small>
                  </span>
                  <i>=</i>
                  <span className="is-total">
                    {penalty}분<small>A번의 총시간</small>
                  </span>
                </>
              ) : (
                <p>아직 못 푼 문제는 총시간에 더하지 않아요.</p>
              )}
            </div>
            <button
              type="button"
              className={`experience-button ${solved ? 'is-dark' : 'is-lime'}`}
              onClick={() => setSolved(!solved)}
            >
              {solved
                ? '정답 이전으로 돌아가기 ↺'
                : '35분에 정답 제출해 보기 →'}
            </button>
            <p className="judge-card-caption">
              다른 문제도 풀었다면 각 문제의 시간을 합산해요. 정답 이후의 제출은
              해당 문제 점수에 영향을 주지 않아요.
            </p>
          </div>
        </div>
        <div className="judge-score-notes">
          <details className="judge-inline-details">
            <summary>어떤 판정이 20분에 포함되나요?</summary>
            <div>
              <p>
                현재 집계 대상은 틀렸습니다·런타임 에러·시간 초과·메모리
                초과·출력 초과·시스템 에러입니다. 해당 문제의 첫 정답 전에 나온
                결과만 세며, 컴파일 에러와 채점 진행 중인 제출은 제외합니다.
              </p>
              <p>
                시스템 에러가 보이면 운영자에게 알려 주세요. 재채점으로 판정이
                바뀌면 변경된 결과로 점수를 다시 계산합니다. 못 푼 문제의 실패는
                총시간에는 더하지 않고, 총시간까지 같은 팀의 순위를 비교할 때
                사용합니다.
              </p>
            </div>
          </details>
          <details className="judge-inline-details">
            <summary>제출했는데 스코어보드가 멈춰 있나요?</summary>
            <div>
              <p>
                대회에 프리즈가 설정되어 있으면 기준 시각 이후 제출의 결과는
                공개 스코어보드에 바로 반영되지 않아요. 제출과 채점은 계속되며,
                대회의 결과 공개 방식에 따라 나중에 반영됩니다.
              </p>
              <p>
                총시간 표시 여부도 대회 화면의 공개 설정에 따릅니다. 위 표는
                계산 방법을 보여주는 예시예요.
              </p>
            </div>
          </details>
        </div>
      </ExperienceReveal>
    </section>
  );
}

export default function JudgeParticipantExperience() {
  return (
    <>
      <nav
        className="experience-container judge-topic-links"
        aria-label="채점 알아보기"
      >
        <a href="#judge-journey">채점 흐름 ↗</a>
        <a href="#judge-performance">실행 시간 ↗</a>
        <a href="#judge-verdicts">결과 읽기 ↗</a>
        <a href="#judge-scoreboard">점수 계산 ↗</a>
      </nav>
      <Journey />
      <Performance />
      <Verdicts />
      <Scoreboard />
    </>
  );
}
