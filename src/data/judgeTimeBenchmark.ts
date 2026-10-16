// Generated from current real-queue CPU-time measurements.
export const judgeTimeBenchmark = {
  schemaVersion: 3,
  measuredAt: '2026-10-16T07:30:33.461317+00:00',
  finishedAt: '2026-10-16T07:42:54.656006+00:00',
  displayDate: '2026. 10. 16. 16:30~16:42 KST',
  snapshotPath: '/guides/judge-tle-benchmark-2026-10-16.json',
  runtimeMetric: 'isolate_cpu_time_ms',
  clockPolicy: {
    target_mhz: 2200,
    source: 'service-owner-confirmed host policy',
    host_policy_independently_verified: false,
  },
  profiles: [
    {
      id: 'modulo',
      label: '단순 나머지 누적',
      countLabel: '1억 회 반복',
      description:
        '상수 97로 나머지를 구하고 더해요. 최적화가 잘 되는 반복이에요.',
    },
    {
      id: 'dependent',
      label: '연속 곱셈·나머지',
      countLabel: '1억 회 반복',
      description:
        '직전 계산값으로 다음 값을 구해요. 계산 사이에 의존성이 있어요.',
    },
    {
      id: 'memory',
      label: '흩어진 배열 접근',
      countLabel: '1억 회 접근',
      description: '419만 개 인덱스 배열에서 읽은 값으로 다음 위치를 찾아가요.',
    },
    {
      id: 'search',
      label: '배열 이진 탐색',
      countLabel: '100만 번 탐색',
      description:
        '104만 개 정렬 배열을 검색해요. 한 탐색에 최대 21회 비교해요.',
    },
  ],
  languages: [
    {
      id: 'c99',
      label: 'C99',
    },
    {
      id: 'cpp17',
      label: 'C++17',
    },
    {
      id: 'python313',
      label: 'Python 3.13',
    },
    {
      id: 'java8',
      label: 'Java 8 호환',
    },
  ],
  safetyFactor: 2,
  cases: [
    {
      id: 'modulo-c99',
      profile: 'modulo',
      language: 'c99',
      iterations: 100000000,
      sampleCount: 3,
      runtimeMs: {
        min: 175,
        max: 175,
        mean: 175,
      },
      serialMaxMs: 175,
    },
    {
      id: 'modulo-cpp17',
      profile: 'modulo',
      language: 'cpp17',
      iterations: 100000000,
      sampleCount: 3,
      runtimeMs: {
        min: 174,
        max: 175,
        mean: 174.33333333333334,
      },
      serialMaxMs: 175,
    },
    {
      id: 'modulo-python313',
      profile: 'modulo',
      language: 'python313',
      iterations: 100000000,
      sampleCount: 3,
      runtimeMs: {
        min: 23900,
        max: 24476,
        mean: 24170,
      },
      serialMaxMs: 24476,
    },
    {
      id: 'modulo-java8',
      profile: 'modulo',
      language: 'java8',
      iterations: 100000000,
      sampleCount: 3,
      runtimeMs: {
        min: 326,
        max: 332,
        mean: 328.3333333333333,
      },
      serialMaxMs: 332,
    },
    {
      id: 'dependent-c99',
      profile: 'dependent',
      language: 'c99',
      iterations: 100000000,
      sampleCount: 3,
      runtimeMs: {
        min: 691,
        max: 692,
        mean: 691.6666666666666,
      },
      serialMaxMs: 692,
    },
    {
      id: 'dependent-cpp17',
      profile: 'dependent',
      language: 'cpp17',
      iterations: 100000000,
      sampleCount: 3,
      runtimeMs: {
        min: 692,
        max: 693,
        mean: 692.3333333333334,
      },
      serialMaxMs: 693,
    },
    {
      id: 'dependent-python313',
      profile: 'dependent',
      language: 'python313',
      iterations: 100000000,
      sampleCount: 3,
      runtimeMs: {
        min: 30623,
        max: 31888,
        mean: 31061.333333333332,
      },
      serialMaxMs: 31888,
    },
    {
      id: 'dependent-java8',
      profile: 'dependent',
      language: 'java8',
      iterations: 100000000,
      sampleCount: 3,
      runtimeMs: {
        min: 899,
        max: 903,
        mean: 901,
      },
      serialMaxMs: 903,
    },
    {
      id: 'memory-c99',
      profile: 'memory',
      language: 'c99',
      iterations: 100000000,
      sampleCount: 3,
      runtimeMs: {
        min: 4308,
        max: 4690,
        mean: 4461.666666666667,
      },
      serialMaxMs: 4690,
    },
    {
      id: 'memory-cpp17',
      profile: 'memory',
      language: 'cpp17',
      iterations: 100000000,
      sampleCount: 3,
      runtimeMs: {
        min: 4353,
        max: 4489,
        mean: 4413.666666666667,
      },
      serialMaxMs: 4489,
    },
    {
      id: 'memory-python313',
      profile: 'memory',
      language: 'python313',
      iterations: 100000000,
      sampleCount: 3,
      runtimeMs: {
        min: 43990,
        max: 44127,
        mean: 44071,
      },
      serialMaxMs: 44127,
    },
    {
      id: 'memory-java8',
      profile: 'memory',
      language: 'java8',
      iterations: 100000000,
      sampleCount: 3,
      runtimeMs: {
        min: 4538,
        max: 4818,
        mean: 4716.666666666667,
      },
      serialMaxMs: 4818,
    },
    {
      id: 'search-c99',
      profile: 'search',
      language: 'c99',
      iterations: 1000000,
      sampleCount: 3,
      runtimeMs: {
        min: 303,
        max: 315,
        mean: 308.3333333333333,
      },
      serialMaxMs: 315,
    },
    {
      id: 'search-cpp17',
      profile: 'search',
      language: 'cpp17',
      iterations: 1000000,
      sampleCount: 3,
      runtimeMs: {
        min: 305,
        max: 308,
        mean: 306.6666666666667,
      },
      serialMaxMs: 308,
    },
    {
      id: 'search-python313',
      profile: 'search',
      language: 'python313',
      iterations: 1000000,
      sampleCount: 3,
      runtimeMs: {
        min: 10688,
        max: 12468,
        mean: 11312,
      },
      serialMaxMs: 12468,
    },
    {
      id: 'search-java8',
      profile: 'search',
      language: 'java8',
      iterations: 1000000,
      sampleCount: 3,
      runtimeMs: {
        min: 459,
        max: 482,
        mean: 473,
      },
      serialMaxMs: 482,
    },
  ],
} as const;

export type TimeComplexity =
  | 'linear'
  | 'n_log_n'
  | 'quadratic'
  | 'pairs'
  | 'cubic';
type Reference = {
  profile?: string;
  iterations: number;
  runtimeMs: { max: number };
};
export function estimateTimeBudget(
  reference: Reference,
  complexity: TimeComplexity,
  n: number,
  safetyFactor = 2,
) {
  if (
    !Number.isSafeInteger(n) ||
    n < 1 ||
    n > 1_000_000_000 ||
    !Number.isFinite(safetyFactor) ||
    safetyFactor < 1 ||
    safetyFactor > 10
  )
    return null;
  if (
    !Number.isFinite(reference.iterations) ||
    !Number.isFinite(reference.runtimeMs.max) ||
    !(reference.iterations > 0) ||
    !(reference.runtimeMs.max > 0)
  )
    return null;
  if (reference.profile === 'search' && complexity !== 'linear') return null;
  const count = {
    linear: n,
    n_log_n: n * Math.ceil(Math.log2(n)),
    quadratic: n * n,
    pairs: (n * (n - 1)) / 2,
    cubic: n * n * n,
  }[complexity];
  if (!Number.isFinite(count)) return null;
  return {
    count,
    budgetMs:
      (count / reference.iterations) * reference.runtimeMs.max * safetyFactor,
    extrapolated: count > reference.iterations,
  };
}
