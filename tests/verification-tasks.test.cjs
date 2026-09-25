const { test, beforeEach, afterEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><body></body>', {
  url: 'https://judge.test/operator',
});
global.window = dom.window;
global.document = dom.window.document;
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
let root, queryClient, saved, writable, requests, stops;
const mocks = {
  '@/domains/identityAccess/queryIdentity': {
    tokenQueryIdentity: () => 'test-user',
  },
  '@/domains/problemManagement/verificationTasks': {
    listVerificationTasks: async () => ({
      available: true,
      can_run: writable,
      limits: { max_cost_usd: 0.2 },
      sources: [],
      tasks: saved ? [saved] : [],
    }),
    getVerificationTask: async () => saved,
    createVerificationTask: async (cid, pid, token, body) => {
      requests.push({ cid, pid, token, body });
      saved = fixture('queued');
      return saved;
    },
    stopVerificationTask: async () => {
      stops++;
      saved = {
        ...saved,
        cancel_requested: true,
        analysis: { ...saved.analysis, status: 'stopped' },
      };
      return saved;
    },
  },
  '@/domains/problemManagement/verificationAi': {},
};
const cache = new Map();
function source(relative) {
  const file = path.resolve(__dirname, '../src', relative);
  if (cache.has(file)) return cache.get(file).exports;
  const loaded = new Module(file, module);
  loaded.filename = file;
  loaded.paths = Module._nodeModulePaths(path.dirname(file));
  const native = loaded.require.bind(loaded);
  loaded.require = (id) => {
    if (id.endsWith('.css')) return {};
    if (mocks[id]) return mocks[id];
    if (id.startsWith('@/') || id.startsWith('./')) {
      const absolute = id.startsWith('@/')
        ? path.resolve(__dirname, '../src', id.slice(2))
        : path.resolve(path.dirname(file), id);
      const found = ['.ts', '.tsx']
        .map((ext) => absolute + ext)
        .find((f) => fs.existsSync(f));
      if (found)
        return source(path.relative(path.resolve(__dirname, '../src'), found));
    }
    return native(id);
  };
  cache.set(file, loaded);
  loaded._compile(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    file,
  );
  return loaded.exports;
}
const Panel = source('components/operator/VerificationTaskPanel.tsx').default;
function fixture(status) {
  return {
    task_id: 'task-one',
    parent_task_id: null,
    goal: 'checker의 오판을 확인해 주세요.',
    source_asset_id: null,
    cancel_requested: false,
    analysis: {
      engine_version: 2,
      analysis_id: 'task-one',
      status,
      model: 'gpt-5.4-mini',
      created_at: '2026-09-25T00:00:00Z',
      phase: '조건 확인',
      plan: [{ title: 'checker 실행', status: 'in_progress' }],
      findings: [
        {
          id: 'condition',
          title: '<script>unexpected</script>',
          detail: '예상 조건이 빠져 있습니다.',
          status: 'hypothesis',
          evidence_refs: ['problem'],
        },
      ],
      question:
        status === 'awaiting_input'
          ? {
              question: '동률이면 어느 답을 허용하나요?',
              reason: '문제에 동률 조건이 없습니다.',
            }
          : null,
    },
  };
}
async function flush() {
  await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
}
async function render() {
  await act(async () =>
    root.render(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(Panel, {
          contestId: 'contest',
          problemId: 'problem',
          token: 'token',
        }),
      ),
    ),
  );
  await flush();
  await flush();
}
const button = (text) =>
  [...document.querySelectorAll('button')].find((b) => b.textContent === text);
beforeEach(() => {
  saved = fixture('awaiting_input');
  writable = true;
  requests = [];
  stops = 0;
  document.body.innerHTML = '<div id="root"></div>';
  root = createRoot(document.getElementById('root'));
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  queryClient.clear();
});
after(() => dom.window.close());

test('viewing a shared task does not start billing and renders plans/questions safely', async () => {
  await render();
  assert.equal(requests.length, 0);
  assert.match(document.body.textContent, /검증 계획/);
  assert.match(document.body.textContent, /동률이면 어느 답/);
  assert.match(document.body.textContent, /확인한 사실과 가설/);
  assert.equal(document.querySelectorAll('script').length, 0);
  assert.ok(button('질문에 답변하기'));
});

test('answering continues from the chosen task and preserves the typed request', async () => {
  await render();
  await act(async () => button('질문에 답변하기').click());
  const textarea = document.querySelector('textarea');
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      dom.window.HTMLTextAreaElement.prototype,
      'value',
    ).set.call(textarea, '가장 작은 인덱스를 정답으로 판단해 주세요.');
    textarea.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  assert.equal(button('이어서 검증 요청').disabled, false);
  await act(async () =>
    document
      .querySelector('form')
      .dispatchEvent(
        new dom.window.Event('submit', { bubbles: true, cancelable: true }),
      ),
  );
  await flush();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.parent_task_id, 'task-one');
  assert.match(requests[0].body.goal, /가장 작은 인덱스/);
});

test('running work can be stopped without starting a new analysis', async () => {
  saved = fixture('running');
  await render();
  assert.match(document.body.textContent, /새 작업을 함께/);
  await act(async () => button('작업 중지').click());
  await flush();
  assert.equal(stops, 1);
  assert.equal(requests.length, 0);
  assert.match(document.body.textContent, /중지됨/);
});

test('read-only operators cannot submit or stop tasks', async () => {
  writable = false;
  saved = fixture('running');
  await render();
  assert.equal(button('검증 맡기기').disabled, true);
  assert.equal(button('작업 중지'), undefined);
  assert.match(document.body.textContent, /문제 테스트 권한이 필요/);
});

test('a new independent task can be requested while another is running', async () => {
  saved = fixture('running');
  await render();
  const textarea = document.querySelector('textarea');
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      dom.window.HTMLTextAreaElement.prototype,
      'value',
    ).set.call(textarea, '별도 검증 코드도 함께 검사해 주세요.');
    textarea.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  assert.equal(button('검증 맡기기').disabled, false);
  await act(async () =>
    document
      .querySelector('form')
      .dispatchEvent(
        new dom.window.Event('submit', { bubbles: true, cancelable: true }),
      ),
  );
  await flush();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.parent_task_id, null);
});
