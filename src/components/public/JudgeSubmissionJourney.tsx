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
const stageDurations = [2400, 2400, 3600, 4800] as const;
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
    '내 코드가 채점되고 있어요',
    '결과 칸에 ‘채점 중’이 표시됩니다. 이 화면에서는 테스트별 진행 상황 대신 최종 판정이 나올 때까지 기다리면 돼요.',
  ],
  [
    '판정과 실행 정보가 남아요',
    '채점이 끝나면 결과 칸에 최종 판정이 표시되고, 시간과 메모리도 함께 확인할 수 있어요.',
  ],
];

export default function JudgeSubmissionJourney() {
  const [{ step, submittedAt }, setScene] = useState(() => ({
    step: 0,
    submittedAt: new Date().toISOString(),
  }));
  const isVisible = useDocumentVisibility();
  const finished = step === stages.length - 1;
  const status = stages[step];

  useEffect(() => {
    if (!isVisible) return;
    const timer = window.setTimeout(() => {
      setScene((current) => {
        const next = (current.step + 1) % stages.length;
        return {
          step: next,
          submittedAt:
            next === 0 ? new Date().toISOString() : current.submittedAt,
        };
      });
    }, stageDurations[step]);
    return () => window.clearTimeout(timer);
  }, [step, isVisible]);

  const submission: Submission = {
    submission_id: 'a1b2c3d4-demo',
    problem_id: 'sum-example',
    problem_code: 'A',
    problem_title: 'A. 두 수의 합',
    team_name: '예시 참가팀',
    language: 'cpp17',
    source_code: source,
    submitted_at: submittedAt,
    status,
    // Match the participant view with progress hidden; never inject operator diagnostics.
    runtime_ms: finished ? 17 : null,
    memory_kb: finished ? 584 : null,
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
              참가자의 채점현황이 자동으로 바뀌는 모습을 살펴보세요.
              <br />
              언어를 누르면 제출 코드도 펼쳐볼 수 있어요.
            </p>
          </div>
          <ol className="judge-flow-steps" aria-label="채점 과정 예시 단계">
            {stages.map((stage, index) => (
              <li
                key={stage}
                aria-current={index === step ? 'step' : undefined}
                className={index <= step ? 'is-reached' : ''}
              >
                <span>0{index + 1}</span>
                {index === 3 ? '결과 도착' : submissionStatusLabel(stage)}
              </li>
            ))}
          </ol>
          <div
            className="judge-journey-screen zoj-participant"
            aria-label="참가자 채점현황 예시"
          >
            <div className="judge-journey-screen-heading">
              <PageHeading
                level={2}
                title="채점현황"
                variant="contest"
                description="대회 중에는 로그인한 참가팀의 제출만 확인합니다."
              />
              <span className="judge-small-label">참가자 화면 · 예시</span>
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
          <div className="judge-journey-explanation">
            <span aria-hidden="true">0{step + 1}</span>
            <div>
              <h3>{descriptions[step][0]}</h3>
              <p>{descriptions[step][1]}</p>
            </div>
          </div>
          <p className="judge-section-footnote">
            참가자 화면을 보여주는 자동 반복 예시예요. 코드와 수치는 설명용이며
            실제 제출은 생성하지 않아요. 실제 대기·채점 시간은 제출마다 달라요.
          </p>
        </ExperienceReveal>
      </div>
    </section>
  );
}
