// Curated from the downloadable 2026-09-26 benchmark. Keep numbers in sync with its records.
export const participantJudgeBenchmark = {
  displayDate: '2026. 9. 26.',
  snapshotPath: '/guides/judge-benchmark-2026-09-26.json',
  nodeCount: 7,
  slotsPerNode: 2,
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
      id: 'loop-cpp',
      label: 'C++17',
      source:
        '#include <iostream>\nint main() {\n    int n; std::cin >> n;\n    long long total = 0;\n    for (int i = 0; i < n; ++i) total += i % 97;\n    std::cout << total << "\\n";\n}\n',
      scenarios: [
        {
          batchSize: 1,
          runtimeMs: 33.0,
          memoryKb: 584.0,
          queueWaitMs: 68.195,
          batchCompletionMs: 629.277,
        },
        {
          batchSize: 10,
          runtimeMs: 33.5,
          memoryKb: 584.0,
          queueWaitMs: 242.221,
          batchCompletionMs: 1019.852,
        },
        {
          batchSize: 100,
          runtimeMs: 34.0,
          memoryKb: 584.0,
          queueWaitMs: 3576.617,
          batchCompletionMs: 8421.739,
        },
      ],
    },
    {
      id: 'loop-python',
      label: 'Python 3.13',
      source:
        'n = int(input())\ntotal = 0\nfor i in range(n):\n    total += i % 97\nprint(total)\n',
      scenarios: [
        {
          batchSize: 1,
          runtimeMs: 819.0,
          memoryKb: 3136.0,
          queueWaitMs: 131.431,
          batchCompletionMs: 993.628,
        },
        {
          batchSize: 10,
          runtimeMs: 969.0,
          memoryKb: 3136.0,
          queueWaitMs: 230.63,
          batchCompletionMs: 1452.827,
        },
        {
          batchSize: 100,
          runtimeMs: 1018.0,
          memoryKb: 3136.0,
          queueWaitMs: 6947.829,
          batchCompletionMs: 15796.48,
        },
      ],
    },
  ],
} as const;
