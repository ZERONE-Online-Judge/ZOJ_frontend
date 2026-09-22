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
  total_running_jobs: 0,
  total_queue_depth: 0,
  allocation_policy: 'internal claim FIFO',
};

test('unloaded judge status shows unknown counts instead of fabricated zeros or a connected state', () => {
  const html = render(undefined, { isFetching: true });
  assert.match(html, /채점 서버를 만나고 있어요/);
  assert.equal((html.match(/<strong>—<\/strong>/g) || []).length, 3);
  assert.doesNotMatch(html, /서버 연결됨/);
});

test('public judge status presents aggregate work without internal allocation policy', () => {
  const html = render({
    ...status,
    total_running_jobs: 7,
    total_queue_depth: 2,
  });
  assert.match(html, /지금, 코드를 채점하고 있어요/);
  assert.match(html, /<strong>7<\/strong>/);
  assert.match(html, /<strong>2<\/strong>/);
  assert.doesNotMatch(html, /internal claim FIFO|할당 정책/);
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

test('queued submissions are distinguished from an idle room', () => {
  const html = render({ ...status, total_queue_depth: 3 });
  assert.match(html, /코드가 채점 차례를 기다리고 있어요/);
  assert.doesNotMatch(html, /다음 도전을 기다리고 있어요/);
});
