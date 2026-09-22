const { test, beforeEach, afterEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://judge.test/operator',
});
global.window = dom.window;
global.document = dom.window.document;
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const {
  QueryClient,
  QueryClientProvider,
  useQuery,
} = require('@tanstack/react-query');
const h = React.createElement;

function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

let uploads, submissions, waits, reads, automaticWait;
const mocks = {
  '@/domains/identityAccess/queryIdentity': {
    tokenQueryIdentity: () => 'test-session',
  },
  '@/domains/problemManagement/api': {
    uploadProblemAsset: (contestId, problemId, token, file, category) => {
      const gate = deferred();
      uploads.push({ contestId, problemId, token, file, category, gate });
      return gate.promise;
    },
    getStorageObjectText: (key) => {
      const gate = deferred();
      reads.push({ key, gate });
      return gate.promise;
    },
  },
  '@/domains/submissionScoreboard/api': {
    createOperatorTestSubmission: (contestId, problemId, token, body) => {
      const gate = deferred();
      submissions.push({ contestId, problemId, token, body, gate });
      return gate.promise;
    },
    waitOperatorTestSubmissionStatus: (contestId, submissionId) => {
      const gate = deferred();
      waits.push({ contestId, submissionId, gate });
      return automaticWait
        ? Promise.resolve(automaticWait(submissionId))
        : gate.promise;
    },
  },
};
const cache = new Map();
function source(relative) {
  const filename = path.resolve(__dirname, '../src', relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const nativeRequire = loaded.require.bind(loaded);
  loaded.require = (id) => {
    if (mocks[id]) return mocks[id];
    if (!id.startsWith('@/')) return nativeRequire(id);
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
const { default: useVerificationCodeRuns, verificationKindFromAsset } = source(
  'domains/problemManagement/useVerificationCodeRuns.ts',
);
const Section = source(
  'components/operator/VerificationCodeSection.tsx',
).default;
let root, client, api, changeProblem;

function Editor() {
  const [problemId, setProblemId] = React.useState('problem-a');
  changeProblem = setProblemId;
  api = useVerificationCodeRuns({
    contestId: 'contest',
    problemId,
    token: 'token',
  });
  const assetsQuery = useQuery({
    queryKey: [
      'operator',
      'problem-assets',
      'contest',
      problemId,
      'test-session',
    ],
    queryFn: async () => [],
    initialData: [],
    enabled: false,
  });
  const assetsByKind = new Map();
  for (const asset of assetsQuery.data) {
    const kind = verificationKindFromAsset(asset);
    assetsByKind.set(kind, [...(assetsByKind.get(kind) ?? []), asset]);
  }
  return h(Section, {
    assetsByKind,
    results: api.results,
    onUpload: api.upload,
    onRun: api.rerun,
    onDelete: api.removeAsset,
    onDismiss: api.dismiss,
    onPreview: () => {},
  });
}

beforeEach(async () => {
  uploads = [];
  submissions = [];
  waits = [];
  reads = [];
  automaticWait = null;
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  document.body.innerHTML = '<div id="root"></div>';
  root = createRoot(document.getElementById('root'));
  await act(async () =>
    root.render(h(QueryClientProvider, { client }, h(Editor))),
  );
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
});
after(() => dom.window.close());

function file(name, contents = name) {
  return new global.File([contents], name, { lastModified: 123 });
}
function asset(id, filename, kind = 'accepted', problemId = 'problem-a') {
  return {
    asset_id: id,
    original_filename: filename,
    storage_key: `problems/${problemId}/verification-solutions/${kind}/${id}/${filename}`,
  };
}
function submission(id, status, progress = {}) {
  return { submission_id: id, status, ...progress };
}
function row(name) {
  return document.querySelector(`[role="group"][aria-label="${name}"]`);
}
function button(parent, label) {
  return [...parent.querySelectorAll('button')].find(
    (node) => node.textContent === label,
  );
}
async function select(label, files) {
  const input = document.querySelector(
    `input[aria-label="${label} 파일 선택"]`,
  );
  assert.equal(input.disabled, false);
  Object.defineProperty(input, 'files', { configurable: true, value: files });
  await act(async () =>
    input.dispatchEvent(new dom.window.Event('change', { bubbles: true })),
  );
}
async function resolve(gate, value) {
  await act(async () => gate.resolve(value));
}
async function flush() {
  await act(async () => new Promise((done) => global.setImmediate(done)));
}

test('all selected files appear in their category immediately and upload/judge independently', async () => {
  await select('정답 코드', [file('first.cpp'), file('second.cpp')]);
  const firstRow = row('first.cpp');
  const secondRow = row('second.cpp');
  const category = document.querySelector('section[aria-label="정답 코드"]');
  assert.equal(category.querySelectorAll('[role="group"]').length, 2);
  assert.match(firstRow.textContent, /업로드 중/);
  assert.match(secondRow.textContent, /업로드 중/);
  assert.doesNotMatch(category.textContent, /등록된 정답 코드가 없습니다/);
  assert.equal(uploads.length, 2);

  // A later file can finish uploading and begin judging while the first upload waits.
  await resolve(uploads[1].gate, asset('second', 'second.cpp'));
  assert.equal(submissions.length, 1);
  assert.equal(submissions[0].body.source_code, 'second.cpp');
  await resolve(
    submissions[0].gate,
    submission('second-submission', 'judging', {
      progress_current: 3,
      progress_total: 10,
    }),
  );
  assert.match(secondRow.textContent, /3\/10 · 30%/);
  assert.equal(
    secondRow
      .querySelector('[role="progressbar"]')
      .getAttribute('aria-valuenow'),
    '30',
  );
  assert.match(firstRow.textContent, /업로드 중/);

  await resolve(uploads[0].gate, asset('first', 'first.cpp'));
  assert.equal(submissions.length, 2);
  await resolve(
    submissions[1].gate,
    submission('first-submission', 'waiting', { queue_position: 2 }),
  );
  assert.equal(waits.length, 2);
  assert.match(firstRow.textContent, /큐 2번째/);

  await select('오답 코드', [file('wrong.py')]);
  assert.equal(uploads.length, 3);
  assert.equal(
    row('wrong.py').closest('section').getAttribute('aria-label'),
    '오답 코드',
  );

  await resolve(waits[0].gate, submission('second-submission', 'accepted'));
  await flush();
  assert.equal(row('second.cpp'), secondRow);
  assert.equal(row('first.cpp'), firstRow);
  assert.equal(category.querySelectorAll('[role="group"]').length, 2);
  assert.match(secondRow.textContent, /통과/);
  assert.equal(button(secondRow, '채점').disabled, false);
  assert.equal(button(firstRow, '처리 중').disabled, true);
  assert.equal(button(firstRow, '삭제').disabled, true);
  await resolve(waits[1].gate, submission('first-submission', 'wrong_answer'));
  assert.match(firstRow.textContent, /확인 필요/);
});

test('upload and judging failures remain on their own rows while other files complete', async () => {
  await select('시간초과 코드', [
    file('upload-fail.cpp'),
    file('judge-fail.cpp'),
    file('good.cpp'),
  ]);
  await act(async () =>
    uploads[0].gate.reject(new Error('upload unavailable')),
  );
  assert.match(
    row('upload-fail.cpp').textContent,
    /처리 실패.*검증 코드 처리에 실패했습니다/,
  );
  assert.equal(button(row('upload-fail.cpp'), '삭제').disabled, false);
  assert.equal(button(row('upload-fail.cpp'), '채점').disabled, true);
  const saved = asset('judge-fail', 'judge-fail.cpp', 'time_limit_exceeded');
  await resolve(uploads[1].gate, saved);
  await act(async () =>
    submissions[0].gate.reject(new Error('judge unavailable')),
  );
  assert.match(
    row('judge-fail.cpp').textContent,
    /처리 실패.*검증 코드 처리에 실패했습니다/,
  );
  assert.equal(button(row('judge-fail.cpp'), '보기').disabled, false);
  assert.equal(button(row('judge-fail.cpp'), '채점').disabled, false);
  await resolve(
    uploads[2].gate,
    asset('good', 'good.cpp', 'time_limit_exceeded'),
  );
  await resolve(
    submissions[1].gate,
    submission('good-submission', 'time_limit_exceeded'),
  );
  assert.match(row('good.cpp').textContent, /통과/);
  await act(async () => button(row('upload-fail.cpp'), '삭제').click());
  assert.equal(row('upload-fail.cpp'), null);
  await act(async () => {
    api.rerun(saved, 'time_limit_exceeded');
    api.rerun(saved, 'time_limit_exceeded');
  });
  assert.equal(reads.length, 1);
  await resolve(reads[0].gate, 'retry source');
  await resolve(
    submissions[2].gate,
    submission('retry-submission', 'time_limit_exceeded'),
  );
  assert.match(row('judge-fail.cpp').textContent, /통과/);
});

test('identical filenames and repeated selections have independent rows and results', async () => {
  const sameFile = file('same.cpp');
  await select('메모리 초과 코드', [sameFile, sameFile]);
  await select('메모리 초과 코드', [sameFile]);
  assert.equal(uploads.length, 3);
  assert.equal(
    document.querySelectorAll('[role="group"][aria-label="same.cpp"]').length,
    3,
  );
  assert.equal(new Set(api.results.map((result) => result.id)).size, 3);
  for (let index = 0; index < 3; index += 1) {
    await resolve(
      uploads[index].gate,
      asset(`same-${index}`, 'same.cpp', 'memory_limit_exceeded'),
    );
    await resolve(
      submissions[index].gate,
      submission(`same-submission-${index}`, 'memory_limit_exceeded'),
    );
  }
  await flush();
  assert.equal(
    document.querySelectorAll('[role="group"][aria-label="same.cpp"]').length,
    3,
  );
  assert.equal(
    api.results.filter((result) => result.stage === 'done').length,
    3,
  );
});

test('switching problems keeps uploads, submissions, caches and results scoped to the original problem', async () => {
  await select('정답 코드', [file('problem-a.cpp')]);
  await act(async () => changeProblem('problem-b'));
  assert.equal(row('problem-a.cpp'), null);
  await select('오답 코드', [file('problem-b.cpp')]);
  await resolve(uploads[0].gate, asset('a', 'problem-a.cpp'));
  assert.equal(submissions[0].problemId, 'problem-a');
  await resolve(submissions[0].gate, submission('submission-a', 'accepted'));
  assert.equal(row('problem-a.cpp'), null);
  assert.equal(api.results.length, 1);
  assert.equal(
    client.getQueryData([
      'operator',
      'problem-assets',
      'contest',
      'problem-a',
      'test-session',
    ]).length,
    1,
  );
  assert.equal(
    client.getQueryData([
      'operator',
      'problem-assets',
      'contest',
      'problem-b',
      'test-session',
    ]).length,
    0,
  );
  await act(async () => changeProblem('problem-a'));
  assert.match(row('problem-a.cpp').textContent, /통과/);
  assert.equal(row('problem-b.cpp'), null);
});

test('long-running judging continues past the old polling limit and stops at a final result', async () => {
  const previousTimeout = window.setTimeout;
  window.setTimeout = (callback) => {
    callback();
    return 0;
  };
  automaticWait = (id) =>
    submission(id, waits.length > 60 ? 'accepted' : 'judging');
  try {
    await select('정답 코드', [file('long.cpp')]);
    await resolve(uploads[0].gate, asset('long', 'long.cpp'));
    await resolve(
      submissions[0].gate,
      submission('long-submission', 'waiting'),
    );
    assert.equal(waits.length, 61);
    assert.equal(api.results[0].stage, 'done');
    assert.match(row('long.cpp').textContent, /통과/);
  } finally {
    window.setTimeout = previousTimeout;
  }
});

test('unmounting stops further polling after the in-flight request returns', async () => {
  await select('정답 코드', [file('leaving.cpp')]);
  await resolve(uploads[0].gate, asset('leaving', 'leaving.cpp'));
  await resolve(
    submissions[0].gate,
    submission('leaving-submission', 'waiting'),
  );
  await act(async () => root.unmount());
  root = { unmount() {} };
  await resolve(waits[0].gate, submission('leaving-submission', 'judging'));
  await new Promise((done) => global.setTimeout(done, 120));
  assert.equal(waits.length, 1);
});
