import { useEffect, useState } from 'react';
import { ExperienceReveal } from '@/components/common/PublicExperience';
import { PageHeading } from '@/components/common/PageLayout';
import ContestSubmissionsTable from '@/components/contest/submissions/ContestSubmissionsTable';
import { submissionStatusLabel } from '@/domains/submissionScoreboard/status';
import type { Submission } from '@/domains/submissionScoreboard/types';
import useDocumentVisibility from '@/shared/hooks/useDocumentVisibility';
import '@/components/contest/ContestWorkspace.css';

const stages = ['waiting', 'preparing', 'judging', 'accepted'] as const;
const source = `#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b << '\\n';
    return 0;
}`;
const frames = [0, 1, 2, 2, 2, 3] as const;
const descriptions = [
  [
    '제출한 코드가 목록에 나타나요',
    '빈 실행 자리가 생기면 채점기가 작업을 가져갑니다. 아직 실행 전이라 시간과 메모리는 -로 표시돼요.',
  ],
  [
    '같은 행에서 준비 상태로 바뀌어요',
    '테스트 자료와 실행 파일을 준비합니다. C++처럼 컴파일이 필요한 언어는 이 단계에서 컴파일해요.',
  ],
  [
    '결과 칸에서 진행률을 확인해요',
    '테스트 처리 현황에 따라 결과 문구와 노란 진행 막대가 갱신됩니다. 여러 테스트를 병렬로 처리하므로 숫자가 한 칸씩 증가하지 않을 수 있어요.',
  ],
  [
    '판정과 실행 정보가 남아요',
    '채점이 끝나면 결과 칸에 최종 판정이 표시되고, 시간과 메모리도 함께 확인할 수 있어요.',
  ],
];

export default function JudgeSubmissionJourney() {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [outcome, setOutcome] = useState<'accepted' | 'wrong_answer'>(
    'accepted',
  );
  const [submittedAt, setSubmittedAt] = useState(() =>
    new Date().toISOString(),
  );
  const isVisible = useDocumentVisibility();
  const step = frames[frame];
  const lastFrame = outcome === 'wrong_answer' ? 3 : 5;
  const finished = frame === lastFrame;
  const activeStep = finished ? 3 : step;
  const status = finished ? outcome : stages[step];
  const progress = finished
    ? outcome === 'accepted'
      ? 5
      : 2
    : Math.max(0, frame - 1);

  useEffect(() => {
    if (!playing || !isVisible) return;
    const timer = window.setTimeout(() => {
      if (frame + 1 >= lastFrame) setPlaying(false);
      setFrame(Math.min(frame + 1, lastFrame));
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [frame, playing, isVisible, lastFrame]);

  function reset(nextOutcome = outcome) {
    setPlaying(false);
    setOutcome(nextOutcome);
    setFrame(0);
    setSubmittedAt(new Date().toISOString());
  }

  const submission: Submission = {
    submission_id: 'a1b2c3d4-demo',
    problem_id: 'sum-example',
    problem_code: 'A',
    problem_title: 'A. 두 수의 합',
    team_name: '예시 참가팀',
    language: 'cpp17',
    source_code:
      outcome === 'accepted' ? source : source.replace('a + b', 'a - b'),
    submitted_at: submittedAt,
    status,
    progress_current: status === 'judging' ? progress : null,
    progress_total: status === 'judging' ? 5 : null,
    runtime_ms: finished ? 17 : null,
    memory_kb: finished ? 584 : null,
    judge_message:
      finished && outcome === 'wrong_answer'
        ? 'wrong answer: expected 5, found -1'
        : null,
    failed_testcase_order: finished && outcome === 'wrong_answer' ? 2 : null,
  };
  submission.code_length_bytes = new TextEncoder().encode(
    submission.source_code,
  ).length;

  return (
    <section className="experience-soft-section" id="judge-journey">
      <div className="experience-container experience-section">
        <ExperienceReveal>
          <div className="experience-section-heading">
            <div>
              <p className="experience-eyebrow">A CODE’S JOURNEY</p>
              <h2>
                내 코드의 상태,
                <br />이 화면에서 달라져요.
              </h2>
            </div>
            <p>
              실제 채점현황 화면으로 따라가 보세요.
              <br />
              언어를 누르면 제출 코드도 펼쳐볼 수 있어요.
            </p>
          </div>
          <div
            className="judge-flow-steps"
            role="group"
            aria-label="채점 과정 예시 단계"
          >
            {stages.map((stage, index) => (
              <button
                type="button"
                key={stage}
                aria-pressed={index === activeStep}
                className={index <= activeStep ? 'is-reached' : ''}
                onClick={() => {
                  setPlaying(false);
                  setFrame(index === 3 ? lastFrame : index);
                }}
              >
                <span>0{index + 1}</span>
                {index === 3 ? '결과 도착' : submissionStatusLabel(stage)}
              </button>
            ))}
          </div>
          <div className="judge-journey-controls">
            <label>
              결과 예시
              <select
                value={outcome}
                onChange={(event) =>
                  reset(event.target.value as typeof outcome)
                }
              >
                <option value="accepted">맞았습니다</option>
                <option value="wrong_answer">틀렸습니다</option>
              </select>
            </label>
            <div>
              <button
                type="button"
                className="judge-journey-play"
                onClick={() => {
                  if (playing) {
                    setPlaying(false);
                    return;
                  }
                  if (finished) reset();
                  setPlaying(true);
                }}
              >
                {playing
                  ? '일시정지'
                  : finished
                    ? '다시 재생'
                    : '채점 흐름 재생'}
              </button>
              <button type="button" onClick={() => reset()}>
                처음으로
              </button>
            </div>
          </div>
          <div
            className="judge-journey-screen zoj-participant"
            aria-label="실제 채점현황 구성으로 보는 체험 화면"
          >
            <div className="judge-journey-screen-heading">
              <PageHeading
                level={2}
                title="채점현황"
                variant="contest"
                description="대회 중에는 로그인한 참가팀의 제출만 확인합니다."
              />
              <span className="judge-small-label">체험용 제출 1건</span>
            </div>
            <ContestSubmissionsTable
              preview
              contestId="journey-example"
              submissions={[submission]}
            />
            <p className="judge-journey-code-hint">
              C++17을 눌러 제출 코드를 확인해 보세요.
            </p>
          </div>
          <div className="judge-journey-explanation" aria-live="polite">
            <span aria-hidden="true">0{activeStep + 1}</span>
            <div>
              <h3>
                {finished && outcome === 'wrong_answer'
                  ? '오답이면 여기서 채점이 끝나요'
                  : descriptions[activeStep][0]}
              </h3>
              <p>
                {finished && outcome === 'wrong_answer'
                  ? '모든 테스트를 통과해야만 정답이에요. 이 예시는 두 번째 테스트에서 종료됐습니다. 실제 화면의 ‘채점 메시지 보기’를 펼쳐 전달된 오류 내용을 확인해 보세요.'
                  : descriptions[activeStep][1]}
              </p>
            </div>
          </div>
          <p className="judge-section-footnote">
            실제 화면과 같은 제출 목록·결과 표시를 사용하는 체험입니다. 코드와
            수치는 설명용이며 실제 제출이나 채점 요청은 생성하지 않아요. 처리
            시간과 결과 도착 순서는 제출마다 다를 수 있어요.
          </p>
        </ExperienceReveal>
      </div>
    </section>
  );
}
