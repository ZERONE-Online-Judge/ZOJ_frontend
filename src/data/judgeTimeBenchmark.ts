// Generated from the downloadable real judge records; parity is tested.
export const judgeTimeBenchmark = {
  schemaVersion: 2,
  measuredAt: '2026-09-26T14:57:28.622988+00:00',
  finishedAt: '2026-09-26T15:04:51.799540+00:00',
  displayDate: '2026. 9. 26. 23:57~2026. 9. 27. 00:04 KST',
  snapshotPath: '/guides/judge-tle-benchmark-2026-09-26.json',
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
      sampleCount: 6,
      runtimeMs: {
        min: 166,
        max: 232,
        mean: 194.33333333333334,
      },
      serialMaxMs: 166,
      loadMaxMs: 232,
    },
    {
      id: 'modulo-cpp17',
      profile: 'modulo',
      language: 'cpp17',
      iterations: 100000000,
      sampleCount: 6,
      runtimeMs: {
        min: 165,
        max: 331,
        mean: 227.66666666666666,
      },
      serialMaxMs: 166,
      loadMaxMs: 331,
    },
    {
      id: 'modulo-python313',
      profile: 'modulo',
      language: 'python313',
      iterations: 100000000,
      sampleCount: 6,
      runtimeMs: {
        min: 14852,
        max: 20178,
        mean: 17792,
      },
      serialMaxMs: 16859,
      loadMaxMs: 20178,
    },
    {
      id: 'modulo-java8',
      profile: 'modulo',
      language: 'java8',
      iterations: 100000000,
      sampleCount: 6,
      runtimeMs: {
        min: 216,
        max: 322,
        mean: 267.8333333333333,
      },
      serialMaxMs: 217,
      loadMaxMs: 322,
    },
    {
      id: 'dependent-c99',
      profile: 'dependent',
      language: 'c99',
      iterations: 100000000,
      sampleCount: 6,
      runtimeMs: {
        min: 466,
        max: 629,
        mean: 545,
      },
      serialMaxMs: 467,
      loadMaxMs: 629,
    },
    {
      id: 'dependent-cpp17',
      profile: 'dependent',
      language: 'cpp17',
      iterations: 100000000,
      sampleCount: 6,
      runtimeMs: {
        min: 466,
        max: 630,
        mean: 545.6666666666666,
      },
      serialMaxMs: 466,
      loadMaxMs: 630,
    },
    {
      id: 'dependent-python313',
      profile: 'dependent',
      language: 'python313',
      iterations: 100000000,
      sampleCount: 6,
      runtimeMs: {
        min: 19312,
        max: 24440,
        mean: 22007,
      },
      serialMaxMs: 20627,
      loadMaxMs: 24440,
    },
    {
      id: 'dependent-java8',
      profile: 'dependent',
      language: 'java8',
      iterations: 100000000,
      sampleCount: 6,
      runtimeMs: {
        min: 567,
        max: 777,
        mean: 687.3333333333334,
      },
      serialMaxMs: 618,
      loadMaxMs: 777,
    },
    {
      id: 'memory-c99',
      profile: 'memory',
      language: 'c99',
      iterations: 100000000,
      sampleCount: 6,
      runtimeMs: {
        min: 3073,
        max: 13916,
        mean: 7462.333333333333,
      },
      serialMaxMs: 3426,
      loadMaxMs: 13916,
    },
    {
      id: 'memory-cpp17',
      profile: 'memory',
      language: 'cpp17',
      iterations: 100000000,
      sampleCount: 6,
      runtimeMs: {
        min: 3575,
        max: 14512,
        mean: 8184.333333333333,
      },
      serialMaxMs: 3726,
      loadMaxMs: 14512,
    },
    {
      id: 'memory-python313',
      profile: 'memory',
      language: 'python313',
      iterations: 100000000,
      sampleCount: 6,
      runtimeMs: {
        min: 33350,
        max: 51752,
        mean: 42645.5,
      },
      serialMaxMs: 40966,
      loadMaxMs: 51752,
    },
    {
      id: 'memory-java8',
      profile: 'memory',
      language: 'java8',
      iterations: 100000000,
      sampleCount: 6,
      runtimeMs: {
        min: 3624,
        max: 13146,
        mean: 7459.833333333333,
      },
      serialMaxMs: 3774,
      loadMaxMs: 13146,
    },
    {
      id: 'search-c99',
      profile: 'search',
      language: 'c99',
      iterations: 1000000,
      sampleCount: 6,
      runtimeMs: {
        min: 265,
        max: 371,
        mean: 302.8333333333333,
      },
      serialMaxMs: 266,
      loadMaxMs: 371,
    },
    {
      id: 'search-cpp17',
      profile: 'search',
      language: 'cpp17',
      iterations: 1000000,
      sampleCount: 6,
      runtimeMs: {
        min: 266,
        max: 369,
        mean: 311.5,
      },
      serialMaxMs: 266,
      loadMaxMs: 369,
    },
    {
      id: 'search-python313',
      profile: 'search',
      language: 'python313',
      iterations: 1000000,
      sampleCount: 6,
      runtimeMs: {
        min: 6783,
        max: 9858,
        mean: 8182.5,
      },
      serialMaxMs: 7084,
      loadMaxMs: 9858,
    },
    {
      id: 'search-java8',
      profile: 'search',
      language: 'java8',
      iterations: 1000000,
      sampleCount: 6,
      runtimeMs: {
        min: 316,
        max: 475,
        mean: 387.5,
      },
      serialMaxMs: 316,
      loadMaxMs: 475,
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
