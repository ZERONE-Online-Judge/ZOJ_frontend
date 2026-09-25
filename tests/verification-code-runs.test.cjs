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
  keepPreviousData,
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

let uploads,
  submissions,
  waits,
  reads,
  automaticWait,
  savedRuns,
  savedAnalysis,
  analysisReads,
  analysisRequests,
  historyReads,
  historyGate;
const mocks = {
  '@/domains/problemManagement/verificationAi': {
    listVerificationRuns: async (contestId, problemId, token) => {
      historyReads.push({ contestId, problemId, token });
      return historyGate ? historyGate.promise : savedRuns;
    },
    getVerificationAnalysis: async () => {
      analysisReads++;
      return savedAnalysis;
    },
    requestVerificationAnalysis: async () => {
      analysisRequests++;
      return savedAnalysis;
    },
  },
  '@/domains/identityAccess/queryIdentity': {
    tokenQueryIdentity: (token) => (token === 'token' ? 'test-session' : token),
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

function Editor({ token = 'token' } = {}) {
  const [problemId, setProblemId] = React.useState('problem-a');
  changeProblem = setProblemId;
  api = useVerificationCodeRuns({
    contestId: 'contest',
    problemId,
    token,
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
    contestId: 'contest',
    token: 'token',
    aiAvailable: api.aiAvailable,
    historyError: api.historyError,
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
  savedRuns = { available: false, model: 'gpt-5.4', runs: [] };
  savedAnalysis = { available: false, analysis: null };
  analysisReads = 0;
  analysisRequests = 0;
  historyReads = [];
  historyGate = null;
  client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        placeholderData: keepPreviousData,
      },
      mutations: { gcTime: Infinity },
    },
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
  await act(async () => new Promise((done) => global.setTimeout(done, 10)));
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
  assert.equal(submissions[0].body.verification_asset_id, 'second');
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

test('judge details preserve output whitespace and omit internal metadata from the readable message', () => {
  const { parseVerificationDetails } = source(
    'domains/problemManagement/verificationDetails.ts',
  );
  const detail = parseVerificationDetails(
    'testcase #2 (2.in / 2.out): wrong answer\r\n[source_sha256] abc123\r\n[input_storage_key] internal/key\r\n[output_storage_key] internal/output\r\n[input]\r\n 4 5\r\n\r\n[expected]\r\n6 \r\n\r\n[actual]\r\n',
  );
  assert.equal(detail.testcaseOrder, 2);
  assert.equal(detail.message, 'wrong answer');
  assert.equal(detail.input, ' 4 5\n');
  assert.equal(detail.expected, '6 \n');
  assert.equal(detail.actual, '');
  assert.equal(
    parseVerificationDetails('runtime failed').message,
    'runtime failed',
  );
  assert.equal(parseVerificationDetails().input, undefined);
});

test('compact results keep long logs collapsed and separate input, expected and actual output', async () => {
  await select('오답 코드', [file('readable.cpp')]);
  await resolve(
    uploads[0].gate,
    asset('readable', 'readable.cpp', 'wrong_answer'),
  );
  const judgeMessage =
    'testcase #2 (2.in / 2.out): wrong answer expected 6, found 5\n[source_sha256] abc123\n[input]\n4 5\n[expected]\n6\n[actual]\n5';
  await resolve(
    submissions[0].gate,
    submission('readable-submission', 'wrong_answer', {
      judge_message: judgeMessage,
      failed_testcase_order: 2,
    }),
  );
  const entry = row('readable.cpp');
  const summary = entry.querySelector('[aria-live="polite"]');
  assert.match(summary.textContent, /통과.*판정.*틀렸습니다.*테스트케이스 #2/);
  assert.doesNotMatch(
    summary.textContent,
    /source_sha256|wrong answer expected/,
  );
  const details = entry.querySelector('details');
  assert.equal(details.open, false);
  await act(async () => details.querySelector('summary').click());
  assert.equal(details.open, true);
  assert.equal(
    details.querySelector('pre[aria-label="입력"]').textContent,
    '4 5',
  );
  assert.equal(
    details.querySelector('pre[aria-label="기대 출력"]').textContent,
    '6',
  );
  assert.equal(
    details.querySelector('pre[aria-label="실제 출력"]').textContent,
    '5',
  );
  const raw = details.querySelector('details');
  assert.equal(raw.open, false);
  assert.equal(raw.querySelector('pre').textContent, judgeMessage);
});

async function restoreSavedReport({ available = true, partial = false } = {}) {
  const report = {
    summary: '<img src=x onerror=alert(1)> 합 계산 오류',
    verdict_assessment: '실제 오답 판정과 코드가 일치합니다.',
    causes: [
      {
        title: '상수 출력',
        confidence: 'high',
        evidence: '테스트 #1',
        explanation: '항상 4를 출력합니다.',
        code_reference: 'main.py:1',
      },
    ],
    fixes: [
      {
        title: '입력 합산',
        change: '두 수를 더합니다.',
        code_example: 'print(a + b)',
        verification: '경계값을 다시 채점합니다.',
      },
    ],
    suggested_tests: [
      { input: '-1 1', expected_output: '0', explanation: '미실행 제안' },
    ],
    limitations: ['실행하지 않은 정적 검토입니다.'],
  };
  const analysis = {
    analysis_id: 'analysis',
    status: 'succeeded',
    model: 'gpt-5.4',
    report,
    coverage: {
      partial,
      total_testcases: 2,
      full_testcases: partial ? 1 : 2,
      partial_testcases: partial ? 1 : 0,
      omitted_testcases: 0,
      testcase_version: 1,
      files: [],
      notes: partial ? ['큰 입력은 앞부분만 제공'] : [],
    },
  };
  savedAnalysis = { available, analysis };
  savedRuns = {
    available,
    model: 'gpt-5.4',
    runs: [
      {
        asset_id: 'saved',
        asset: asset('saved', 'saved.py'),
        expected_status: 'accepted',
        stale: true,
        submission: submission('saved-submission', 'wrong_answer', {
          submitted_at: '2026-09-25T01:00:00Z',
        }),
        analysis: { ...analysis, report: undefined },
      },
    ],
  };
  await act(async () =>
    client.invalidateQueries({ queryKey: ['operator', 'verification-runs'] }),
  );
  await flush();
  return row('saved.py');
}

test('server verification history restores shared report and expanding never calls the paid POST', async () => {
  const saved = await restoreSavedReport({ partial: true });
  assert.ok(saved);
  const expand = [...saved.querySelectorAll('button')].find((node) =>
    node.textContent.includes('저장된 AI 분석 보기'),
  );
  await act(async () => expand.click());
  await flush();
  assert.match(saved.textContent, /수정 방법과 재검증/);
  assert.match(saved.textContent, /일부 자료만 검토/);
  assert.match(saved.textContent, /이전 채점 기준/);
  assert.match(saved.textContent, /<img src=x onerror=alert\(1\)>/);
  assert.equal(saved.querySelector('img'), null);
  assert.equal(analysisReads, 1);
  assert.equal(analysisRequests, 0);
  assert.equal(submissions.length, 0);
});

test('saved reports remain readable with no configured API key and offer no paid request', async () => {
  const saved = await restoreSavedReport({ available: false });
  await act(async () =>
    [...saved.querySelectorAll('button')]
      .find((node) => node.textContent.includes('저장된 AI 분석 보기'))
      .click(),
  );
  await flush();
  assert.match(saved.textContent, /AI 연결이 설정되지 않았습니다/);
  assert.match(saved.textContent, /입력 합산/);
  assert.equal(button(saved, '분석 요청'), undefined);
  assert.equal(analysisRequests, 0);
});

test('agent shows real executions, escaped candidate downloads and cost without paid requests', async () => {
  const saved = await restoreSavedReport();
  Object.assign(savedAnalysis.analysis, {
    engine_version: 2,
    phase: '검증 완료',
    model: 'gpt-5.4-mini',
    tool_count: 8,
    usage: {
      input_tokens: 4000,
      output_tokens: 2000,
      estimated_cost_usd: 0.012,
      by_model: { 'gpt-5.4-mini': { calls: 3 } },
    },
    limits: { max_cost_usd: 0.2, max_runs: 6 },
    executions: [
      {
        submission_id: 'trial1',
        artifact_id: 'original',
        scope: 'selected',
        testcase_orders: [2],
        testcase_count: 1,
        status: 'wrong_answer',
        failed_testcase_order: 2,
        runtime_ms: 10,
        memory_kb: 1024,
        judge_message: '<script>bad()</script>',
        compile_message: '',
        agent_version: '0.2.18',
      },
      {
        submission_id: 'trial2',
        artifact_id: 'candidate-1',
        scope: 'all',
        testcase_orders: null,
        testcase_count: 12,
        status: 'accepted',
        failed_testcase_order: null,
        runtime_ms: 11,
        memory_kb: 1030,
        judge_message: '',
        compile_message: '',
        agent_version: '0.2.18',
      },
    ],
    artifacts: [
      {
        artifact_id: 'candidate-1',
        language: 'python313',
        source: 'print("<script>alert(1)</script>")',
        sha256: 'abc',
      },
    ],
    files_read: [{ file_id: 'original', offset: 0, complete: true }],
    trace: [
      { tool: 'run_code', status: 'completed', detail: 'accepted', at: '' },
    ],
  });
  await act(async () =>
    [...saved.querySelectorAll('button')]
      .find((n) => n.textContent.includes('저장된 AI 분석 보기'))
      .click(),
  );
  await flush();
  assert.match(saved.textContent, /실제 채점 기록/);
  assert.match(saved.textContent, /원본 코드.*선택 1개.*틀렸습니다/);
  assert.match(saved.textContent, /수정안 1.*전체 12개.*정답/);
  assert.match(saved.textContent, /\$0.0120.*한도 \$0.20/);
  const link = saved.querySelector('a[download="candidate-1.py"]');
  assert.equal(
    decodeURIComponent(link.href.split(',')[1]),
    'print("<script>alert(1)</script>")',
  );
  assert.equal(saved.querySelector('script'), null);
  assert.equal(analysisRequests, 0);
});

test('mismatched verdict starts analysis only after the explicit AI button click', async () => {
  await restoreSavedReport();
  savedRuns = {
    ...savedRuns,
    runs: [{ ...savedRuns.runs[0], analysis: null }],
  };
  savedAnalysis = { available: true, analysis: null };
  await act(async () =>
    client.invalidateQueries({ queryKey: ['operator', 'verification-runs'] }),
  );
  await flush();
  const saved = row('saved.py');
  assert.equal(analysisRequests, 0);
  assert.equal(analysisReads, 0);
  const start = [...saved.querySelectorAll('button')].find((n) =>
    n.textContent.includes('AI 분석하기'),
  );
  assert.ok(start);
  savedAnalysis = {
    available: true,
    analysis: {
      analysis_id: 'manual',
      status: 'queued',
      model: 'gpt-5.4-mini',
      engine_version: 2,
    },
  };
  await act(async () => start.click());
  await flush();
  assert.equal(analysisRequests, 1);
  assert.match(saved.textContent, /AI 분석 대기 중/);
});

async function refreshSaved() {
  await act(async () =>
    client.invalidateQueries({ queryKey: ['operator', 'verification-runs'] }),
  );
  await flush();
}

function savedEntry(id, status, extra = {}) {
  return {
    asset_id: 'persisted',
    asset: asset('persisted', 'persisted.py'),
    expected_status: 'accepted',
    submission: submission(id, status, {
      submitted_at: '2026-09-25T03:00:00Z',
      submitted_by_name: '출제 운영자',
      ...extra,
    }),
    analysis: null,
    stale: false,
  };
}

test('latest accepted verdict and logs survive a fresh browser session without AI configuration', async () => {
  savedRuns.runs = [
    savedEntry('last', 'accepted', {
      judge_message: 'all 30 tests passed',
      runtime_ms: 19,
      memory_kb: 1024,
    }),
  ];
  await act(async () => root.unmount());
  client.clear();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  root = createRoot(document.getElementById('root'));
  await act(async () =>
    root.render(
      h(
        QueryClientProvider,
        { client },
        h(Editor, { token: 'another-operator' }),
      ),
    ),
  );
  await flush();
  const entry = row('persisted.py');
  assert.match(entry.textContent, /통과.*판정.*맞았습니다/);
  assert.match(entry.textContent, /서버 저장 · 운영자 공유/);
  assert.match(entry.textContent, /출제 운영자/);
  assert.match(entry.textContent, /all 30 tests passed/);
  assert.equal(entry.querySelector('time').dateTime, '2026-09-25T03:00:00Z');
  assert.equal(api.results[0].submission.runtime_ms, 19);
  assert.equal(historyReads.at(-1).token, 'another-operator');
  assert.equal(submissions.length, 0);
  assert.equal(analysisRequests, 0);
});

test('server completion replaces local judging progress and polling failure', async () => {
  await act(async () =>
    api.rerun(asset('persisted', 'persisted.py'), 'accepted'),
  );
  await resolve(reads[0].gate, 'print(1)');
  await resolve(
    submissions[0].gate,
    submission('last', 'judging', {
      submitted_at: '2026-09-25T03:00:00Z',
      progress_current: 1,
      progress_total: 30,
    }),
  );
  assert.match(row('persisted.py').textContent, /1\/30/);
  savedRuns = {
    ...savedRuns,
    runs: [
      savedEntry('last', 'accepted', { judge_message: 'saved final verdict' }),
    ],
  };
  await refreshSaved();
  assert.equal(api.results[0].stage, 'done');
  assert.match(row('persisted.py').textContent, /통과/);
  assert.equal(row('persisted.py').querySelector('[role="progressbar"]'), null);
  await act(async () =>
    waits[0].gate.reject(new Error('temporary network failure')),
  );
  await flush();
  assert.equal(api.results[0].error, undefined);
  assert.match(row('persisted.py').textContent, /saved final verdict/);
  assert.doesNotMatch(
    row('persisted.py').textContent,
    /temporary network failure/,
  );
  assert.equal(analysisRequests, 0);
});

test('another operator newer request wins over unfinished local run using actual times', async () => {
  await act(async () =>
    api.rerun(asset('persisted', 'persisted.py'), 'accepted'),
  );
  await resolve(reads[0].gate, 'print(1)');
  await resolve(
    submissions[0].gate,
    submission('old', 'judging', {
      submitted_at: '2026-09-25T11:00:00+09:00',
    }),
  );
  // Lexical comparison would incorrectly consider 11:00 newer than 03:00.
  savedRuns = { ...savedRuns, runs: [savedEntry('new', 'accepted')] };
  await refreshSaved();
  assert.equal(api.results.length, 1);
  assert.equal(api.results[0].submission.submission_id, 'new');
  await resolve(
    waits[0].gate,
    submission('old', 'wrong_answer', {
      submitted_at: '2026-09-25T11:00:00+09:00',
    }),
  );
  await flush();
  assert.equal(api.results[0].submission.submission_id, 'new');
  assert.match(row('persisted.py').textContent, /통과/);
});

test('reopening within the global fresh-cache period fetches the newest shared result', async () => {
  savedRuns.runs = [savedEntry('first', 'wrong_answer')];
  await refreshSaved();
  await act(async () => root.unmount());
  savedRuns = { ...savedRuns, runs: [savedEntry('second', 'accepted')] };
  const count = historyReads.length;
  root = createRoot(document.getElementById('root'));
  await act(async () =>
    root.render(h(QueryClientProvider, { client }, h(Editor))),
  );
  await flush();
  assert.ok(historyReads.length > count);
  assert.equal(api.results[0].submission.submission_id, 'second');
  assert.match(row('persisted.py').textContent, /통과/);
  assert.equal(analysisRequests, 0);
});

test('changing problems does not display cached results from the previous problem', async () => {
  savedRuns.runs = [savedEntry('last', 'accepted')];
  await refreshSaved();
  historyGate = deferred();
  await act(async () => changeProblem('problem-b'));
  assert.equal(api.results.length, 0);
  assert.equal(row('persisted.py'), null);
  await resolve(historyGate, { available: false, model: '', runs: [] });
  historyGate = null;
});
