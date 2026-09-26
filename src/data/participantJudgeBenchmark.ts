// Actual 100M-iteration runs. Arithmetic means are checked against all 20 downloadable records.
export const participantJudgeBenchmark = {
  displayDate: '2026. 9. 26.',
  snapshotPath: '/guides/judge-100m-benchmark-2026-09-26.json',
  iterations: 100000000,
  environment: {
    scope: '전체 채점 에이전트 공통',
    cpu: 'Intel Xeon E5-2698 v4 @ 2.20GHz',
    gcc: '14.2.0',
    python: '3.13.13',
    configurationNote:
      '동일한 VM CPU 구성과 공통 에이전트 실행 환경입니다. 2.20GHz는 CPU 모델의 정격 표기입니다.',
  },
  cases: [
    {
      id: 'loop-c',
      label: 'C99',
      sampleCount: 5,
      runtimeMs: {
        mean: 166,
        min: 165,
        max: 167,
      },
    },
    {
      id: 'loop-cpp',
      label: 'C++17',
      sampleCount: 5,
      runtimeMs: {
        mean: 165.6,
        min: 165,
        max: 166,
      },
    },
    {
      id: 'loop-python',
      label: 'Python 3.13',
      sampleCount: 5,
      runtimeMs: {
        mean: 14774.8,
        min: 14300,
        max: 15211,
      },
    },
    {
      id: 'loop-java',
      label: 'Java 8 호환',
      sampleCount: 5,
      runtimeMs: {
        mean: 216.2,
        min: 216,
        max: 217,
      },
    },
  ],
} as const;
