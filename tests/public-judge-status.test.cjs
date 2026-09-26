const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { MemoryRouter } = require('react-router-dom');
let query,
  visible = true,
  options;
const cache = new Map();
function source(relative) {
  const filename = path.resolve(__dirname, '../src', relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const native = loaded.require.bind(loaded);
  loaded.require = (id) => {
    if (id.endsWith('.css')) return {};
    if (id === '@/utils/Icons') return { SvgIcon: () => null };
    if (id === '@tanstack/react-query')
      return {
        useQuery: (value) => {
          options = value;
          return query;
        },
      };
    if (id === '@/domains/auditMonitoring/api')
      return { getPublicJudgeStatus: () => {} };
    if (id === '@/shared/hooks/useDocumentVisibility')
      return { __esModule: true, default: () => visible };
    if (!id.startsWith('@/')) return native(id);
    return source(
      ['.ts', '.tsx']
        .map((ext) => id.slice(2) + ext)
        .find((file) => fs.existsSync(path.resolve(__dirname, '../src', file))),
    );
  };
  cache.set(filename, loaded);
  loaded._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
  return loaded.exports;
}
const JudgeStatus = source('pages/public/JudgeStatusPage.tsx').default;
function render(data, extra = {}) {
  query = {
    data,
    isError: false,
    isFetching: false,
    dataUpdatedAt: data ? 1234567890000 : 0,
    ...extra,
  };
  return renderToStaticMarkup(
    React.createElement(MemoryRouter, null, React.createElement(JudgeStatus)),
  );
}
const status = {
  active_node_count: 5,
};

test('unloaded judge status shows unknown counts instead of fabricated zeros or a connected state', () => {
  const html = render(undefined, { isFetching: true });
  assert.match(html, /채점 서버를 만나고 있어요/);
  assert.equal((html.match(/<strong>—<\/strong>/g) || []).length, 1);
  assert.doesNotMatch(html, /서버 연결됨/);
});

test('public judge status only presents server connectivity, even with cached workload fields', () => {
  const html = render({
    ...status,
    total_running_jobs: 7,
    total_queue_depth: 2,
    allocation_policy: 'internal claim FIFO',
  });
  assert.match(html, /채점 서버가 연결되어 있어요/);
  assert.match(html, /<strong>5<\/strong>/);
  assert.equal((html.match(/class="judge-metric"/g) || []).length, 1);
  assert.doesNotMatch(
    html,
    /지금 채점 중|차례를 기다리는 코드|<strong>[27]<\/strong>|internal claim FIFO|할당 정책|is-busy/,
  );
  assert.equal(html, render(status));
});

test('zero connected servers and stale data never claim a live connection', () => {
  const offline = render({ ...status, active_node_count: 0 });
  assert.match(offline, /채점 서버를 기다리고 있어요/);
  assert.doesNotMatch(offline, /서버 연결됨/);
  const stale = render(status, { isError: true });
  assert.match(stale, /아래 수치는 마지막으로 확인한 상태/);
  assert.match(stale, /다시 확인하기/);
  assert.doesNotMatch(stale, /서버 연결됨/);
});

test('judge status polling pauses when the document is hidden', () => {
  visible = true;
  render(status);
  assert.equal(options.refetchInterval, 5000);
  assert.equal(options.refetchIntervalInBackground, false);
  visible = false;
  render(status);
  assert.equal(options.refetchInterval, false);
  visible = true;
});

test('submission activity never changes public text or animation state', () => {
  const idle = render({
    ...status,
    total_running_jobs: 0,
    total_queue_depth: 0,
  });
  const queued = render({
    ...status,
    total_running_jobs: 0,
    total_queue_depth: 3,
  });
  const running = render({
    ...status,
    total_running_jobs: 7,
    total_queue_depth: 0,
  });
  assert.equal(queued, idle);
  assert.equal(running, idle);
  assert.doesNotMatch(
    idle,
    /다음 제출을 기다리는 중|코드를 확인하는 중|접수된 코드가 기다리는 중/,
  );
});

test('participant runtime averages come from all five actual 100M runs for each language', () => {
  const curated = source(
    'data/participantJudgeBenchmark.ts',
  ).participantJudgeBenchmark;
  const recorded = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, '../public' + curated.snapshotPath),
      'utf8',
    ),
  );
  assert.equal(curated.displayDate, recorded.displayDate);
  assert.equal(curated.iterations, 100000000);
  assert.equal(recorded.measurementCount, 20);
  assert.deepEqual(
    curated.cases.map((item) => item.id),
    ['loop-c', 'loop-cpp', 'loop-python', 'loop-java'],
  );
  for (const example of curated.cases) {
    const reference = recorded.cases.find((item) => item.id === example.id);
    assert.equal(reference.input, '100000000\n');
    assert.equal(reference.output, '4799999352\n');
    assert.equal(reference.runs.length, 5);
    assert.equal(example.sampleCount, 5);
    assert.deepEqual(
      reference.runs.map((run) => run.repeat),
      [1, 2, 3, 4, 5],
    );
    assert.ok(
      reference.runs.every(
        (run) => run.status === 'accepted' && run.other_jobs_observed === 0,
      ),
    );
    const times = reference.runs.map((run) => run.runtime_ms);
    assert.equal(example.runtimeMs.mean, times.reduce((a, b) => a + b, 0) / 5);
    assert.equal(example.runtimeMs.min, Math.min(...times));
    assert.equal(example.runtimeMs.max, Math.max(...times));
    assert.deepEqual(example.runtimeMs, reference.runtimeMs);
  }
});

test('memory reference matches all real measurements and MLE probes', () => {
  const curated = source('data/judgeMemoryBenchmark.ts').judgeMemoryBenchmark;
  const raw = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, '../public' + curated.snapshotPath),
      'utf8',
    ),
  );
  assert.equal(raw.measurementCount, 72);
  assert.equal(
    raw.cases.reduce((n, c) => n + c.runs.length, 0),
    72,
  );
  for (const example of curated.cases) {
    const recorded = raw.cases.find((c) => c.id === example.id);
    const values = recorded.runs.map((r) => r.memory_kb);
    assert.equal(values.length, example.group === 'measurement' ? 5 : 3);
    assert.equal(
      example.memoryKiB.mean,
      values.reduce((a, b) => a + b, 0) / values.length,
    );
    assert.equal(example.memoryKiB.min, Math.min(...values));
    assert.equal(example.memoryKiB.max, Math.max(...values));
    assert.ok(
      recorded.runs.every(
        (r) =>
          r.status === example.expected_status && r.other_jobs_observed === 0,
      ),
    );
    assert.deepEqual(recorded.memoryKiB, example.memoryKiB);
    assert.equal(
      Number(recorded.output.trim()),
      Math.max(0, (example.elements * (example.elements - 1)) / 2),
    );
  }
  const html = render(status);
  assert.match(html, /메모리 실측 원소 수/);
  assert.match(html, /41.56/);
  assert.match(html, /시스템 에러와 채점 진행 중인 제출은 제외/);
  assert.match(html, /72회 측정 기록/);
});

test('walkthrough reuses submission rows, finishes WA early and keeps sample navigation local', async () => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<div id="test-root"></div>', {
    url: 'http://localhost/',
  });
  global.window = dom.window;
  global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const { createRoot } = require('react-dom/client');
  const { act } = React;
  const host = document.getElementById('test-root');
  const root = createRoot(host);
  let nextFrame;
  window.setTimeout = (fn) => {
    nextFrame = fn;
    return 1;
  };
  window.clearTimeout = () => {
    nextFrame = undefined;
  };
  window.setInterval = () => 1;
  window.clearInterval = () => {};
  const Journey = source(
    'components/public/JudgeSubmissionJourney.tsx',
  ).default;
  const click = async (label) => {
    const button = [...host.querySelectorAll('button')].find(
      (node) => node.textContent === label,
    );
    assert.ok(button, label);
    await act(() => button.click());
  };
  visible = true;
  try {
    await act(() =>
      root.render(
        React.createElement(MemoryRouter, null, React.createElement(Journey)),
      ),
    );
    assert.equal(host.querySelectorAll('.zoj-submission-row').length, 1);
    assert.equal(host.querySelectorAll('a[href*="/contests/"]').length, 0);
    assert.match(host.textContent, /채점 대기 중/);
    assert.doesNotMatch(host.textContent, /17 ms/);
    await click('C++17');
    assert.match(host.querySelector('pre').textContent, /a \+ b/);
    await click('채점 흐름 재생');
    await act(() => nextFrame());
    assert.match(
      host.querySelector('.zoj-result-badge').textContent,
      /채점 준비 중/,
    );
    await click('일시정지');
    assert.equal(nextFrame, undefined);
    const select = host.querySelector('select');
    await act(() => {
      select.value = 'wrong_answer';
      select.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    assert.match(host.querySelector('pre').textContent, /a - b/);
    await click('채점 흐름 재생');
    for (let i = 0; i < 3; i++) await act(() => nextFrame());
    assert.match(
      host.querySelector('.zoj-result-badge').textContent,
      /틀렸습니다/,
    );
    assert.match(host.textContent, /두 번째 테스트에서 종료/);
    assert.match(host.textContent, /17 ms/);
    assert.equal(nextFrame, undefined);
    await click('처음으로');
    assert.doesNotMatch(host.textContent, /17 ms/);
    assert.equal(host.querySelectorAll('a[href*="/contests/"]').length, 0);
  } finally {
    await act(() => root.unmount());
    dom.window.close();
    delete global.window;
    delete global.document;
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});
