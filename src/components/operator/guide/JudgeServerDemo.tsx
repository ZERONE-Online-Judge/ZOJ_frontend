import { useState } from 'react';

const scenarios = [
  {
    label: '균일한 환경',
    cpu: 800,
    waiting: 50,
    description:
      '같은 코드·입력을 비슷한 환경에서 실행하면 시간도 비슷하게 나옵니다. 실제 운영에서는 반복 측정으로 편차를 확인하세요.',
  },
  {
    label: '서로 다른 성능',
    cpu: 1250,
    waiting: 50,
    description:
      '서버 B의 처리 속도가 느린 상황입니다. 같은 계산을 끝내는 데 더 많은 CPU 시간이 필요해 서버에 따라 판정이 달라질 수 있습니다.',
  },
  {
    label: 'VM 자원 경합',
    cpu: 800,
    waiting: 500,
    description:
      '서버 B는 CPU를 기다리는 시간이 늘었습니다. CPU 시간은 1초보다 작아도 실제 경과 시간이 1초를 넘어 시간 초과가 될 수 있습니다.',
  },
];

export default function JudgeServerDemo() {
  const [selected, setSelected] = useState(0);
  const [limit, setLimit] = useState(1000);
  const scenario = scenarios[selected];
  const nodes = [
    { name: '서버 A · 비교 기준', cpu: 800, waiting: 50 },
    {
      name: '서버 B · 선택한 상황',
      cpu: scenario.cpu,
      waiting: scenario.waiting,
    },
  ];
  return (
    <div className="og-timeline-demo og-server-demo">
      <div className="og-demo-top">
        <div>
          <span className="og-eyebrow">
            같은 코드 · 같은 입력 · 다른 실행 환경
          </span>
          <h3>서버 환경을 바꾸며 시간을 비교해 보세요</h3>
        </div>
        <span className="og-example-label">가상 수치 · 실제 측정 아님</span>
      </div>
      <div className="og-server-controls">
        <div
          role="group"
          aria-label="채점 서버 비교 상황"
          className="og-server-scenarios"
        >
          {scenarios.map((item, index) => (
            <button
              key={item.label}
              type="button"
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label>
          예시 시간 제한
          <select
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
          >
            <option value={1000}>1,000ms (1초)</option>
            <option value={1500}>1,500ms (1.5초)</option>
          </select>
        </label>
      </div>
      <div
        className="og-server-comparison"
        aria-live="polite"
        aria-atomic="true"
      >
        <p className="og-server-explanation">{scenario.description}</p>
        {nodes.map((node) => {
          const wall = node.cpu + node.waiting;
          const exceeds = node.cpu > limit || wall > limit;
          return (
            <section
              className="og-server-node"
              key={node.name}
              aria-label={node.name}
            >
              <div className="og-server-node-heading">
                <h4>{node.name}</h4>
                <strong className={exceeds ? 'is-over' : 'is-within'}>
                  {exceeds ? '시간 초과' : '시간 안에 완료'}
                </strong>
              </div>
              <div className="og-server-bar" aria-hidden="true">
                <span
                  className="og-server-cpu"
                  style={{ width: `${(node.cpu / 1800) * 100}%` }}
                />
                <span
                  className="og-server-wait"
                  style={{ width: `${(node.waiting / 1800) * 100}%` }}
                />
                <span
                  className="og-server-limit"
                  style={{ left: `${(limit / 1800) * 100}%` }}
                >
                  <span>제한</span>
                </span>
              </div>
              <p>
                CPU {node.cpu.toLocaleString()}ms + 실행 중 대기{' '}
                {node.waiting.toLocaleString()}ms
                {' = '}실제 경과 <strong>{wall.toLocaleString()}ms</strong>
              </p>
            </section>
          );
        })}
        <p className="og-server-takeaway">
          {limit === 1500
            ? '이 예시는 여유가 생기지만, 제한을 늘릴 때는 의도한 느린 풀이까지 통과하지 않는지 다시 검증해야 합니다.'
            : selected === 0
              ? '핵심은 가장 빠른 한 번의 기록보다 모든 채점기에서의 안정적인 실행입니다.'
              : '같은 풀이가 서버 선택이나 부하에 따라 다른 결과를 받지 않도록 실행 환경을 먼저 점검하세요.'}
        </p>
      </div>
      <div className="og-server-legend" aria-hidden="true">
        <span>
          <i className="og-server-cpu" /> CPU 사용
        </span>
        <span>
          <i className="og-server-wait" /> 실행 중 대기
        </span>
        <span>│ 시간 제한선</span>
      </div>
      <p className="og-demo-note">
        막대는 제한 없이 끝까지 실행했을 때 필요한 시간을 단순화한 예시입니다.
        실제 채점은 제한 초과 시 실행을 중단합니다. 실행 중 대기는 채점 전 큐
        대기와 다르며, 이 조작은 실제 서버나 문제의 제한을 변경하지 않습니다.
      </p>
    </div>
  );
}
