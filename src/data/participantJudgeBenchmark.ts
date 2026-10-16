// Arithmetic means of all five current real-queue CPU-time runs.
export const participantJudgeBenchmark = {
  displayDate: '2026. 10. 16.',
  snapshotPath: '/guides/judge-100m-benchmark-2026-10-16.json',
  iterations: 100000000,
  runtimeMetric: 'isolate_cpu_time_ms',
  clockPolicy: {
    target_mhz: 2200,
    source: 'service-owner-confirmed host policy',
    host_policy_independently_verified: false,
  },
  environment: {
    scope: '전체 채점 에이전트 공통',
    cpu: 'Intel Xeon E5-2698 v4 @ 2.20GHz',
    gcc: '14.2.0',
    python: '3.13.16',
    configurationNote:
      'CPU 클럭 2.2GHz 고정 정책 · 에이전트 0.2.23 · 테스트별 isolate CPU 시간. 호스트 클럭 정책은 서비스 운영자가 제공한 설정이며 이 실행에서 호스트 설정을 변경하지 않았습니다.',
  },
  cases: [
    {
      id: 'loop-c',
      label: 'C99',
      sampleCount: 5,
      runtimeMs: {
        min: 174,
        max: 175,
        mean: 174.2,
      },
    },
    {
      id: 'loop-cpp',
      label: 'C++17',
      sampleCount: 5,
      runtimeMs: {
        min: 175,
        max: 176,
        mean: 175.4,
      },
    },
    {
      id: 'loop-python',
      label: 'Python 3.13',
      sampleCount: 5,
      runtimeMs: {
        min: 22535,
        max: 26781,
        mean: 24178.2,
      },
    },
    {
      id: 'loop-java',
      label: 'Java 8 호환',
      sampleCount: 5,
      runtimeMs: {
        min: 243,
        max: 247,
        mean: 245.2,
      },
    },
  ],
} as const;
