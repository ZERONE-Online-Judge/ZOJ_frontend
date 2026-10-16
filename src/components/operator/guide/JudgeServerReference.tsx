import { useState } from 'react';
import { judgeBenchmark } from '@/data/judgeBenchmark';
import { judgeInfrastructure } from '@/data/judgeInfrastructure';
import JudgeBenchmarkExamples from './JudgeBenchmarkExamples';

export default function JudgeServerReference() {
  const [selected, setSelected] = useState('loop-cpp');
  const example = judgeBenchmark.cases.find((item) => item.id === selected)!;

  return (
    <section className="og-server-reference" aria-label="채점 성능 측정 자료">
      <header className="og-reference-header">
        <div>
          <span className="og-eyebrow">ZOJ가 제공하는 채점 환경</span>
          <h3>현재 채점 환경과 과거 실행 기록</h3>
        </div>
        <span className="og-reference-date">
          {judgeInfrastructure.as_of} 구성
        </span>
      </header>
      <div className="og-runtime-facts">
        <div>
          <strong>{judgeInfrastructure.vm.planned_count}대</strong>
          <span>운영 구성 · 실제 연결 상태와 구분</span>
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
      <p className="og-reference-note">
        아래 예제는 {judgeBenchmark.displayDate} 환경의 경과 시간 기록입니다.
        현재 2.2GHz 고정 정책의 CPU 시간은 이 가이드의 연산별 실측 자료를
        기준으로 확인하세요.
      </p>
      <JudgeBenchmarkExamples example={example} onSelect={setSelected} />
      <p className="og-reference-note">
        서버 설치·자원 배정·채점기 운영은 ZOJ가 담당합니다. 운영자는 문제의
        제한·테스트·검증 코드를 관리합니다. 제공 구성은{' '}
        {judgeInfrastructure.as_of} 기준이며, 현재 연결 상태는 채점 현황에
        표시됩니다.
      </p>
    </section>
  );
}
